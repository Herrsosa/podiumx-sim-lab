// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AthlystBondingCurve
 * @notice Unified bonding curve contract for athlete token trading on Monad
 * @dev Uses native MON as reserve currency. Implements quadratic bonding curve: price = a*s² + b*s + c
 * @dev Simplified version without OpenZeppelin dependencies for Hardhat deployment
 */
contract AthlystBondingCurve {

    // ============ Constants ============
    uint256 public constant FEE_BPS = 300;        // 3% total fee
    uint256 public constant ATHLETE_FEE_BPS = 150; // 1.5% to athlete
    uint256 public constant TREASURY_FEE_BPS = 150; // 1.5% to protocol
    uint256 public constant BPS_DENOMINATOR = 10000;
    uint256 public constant PRECISION = 1e18;

    // ============ State ============
    address public owner;
    address public treasuryWallet;
    bool public paused;
    bool private locked; // Reentrancy guard

    struct AthleteToken {
        uint256 supply;           // Current token supply
        uint256 a;                // Curve param (scaled by PRECISION)
        uint256 b;                // Curve param (scaled by PRECISION)
        uint256 c;                // Base price (scaled by PRECISION)
        uint256 treasury;         // Reserve balance in MON
        uint256 athleteEarnings;  // Accumulated athlete fees in MON
        bool initialized;         // Whether token is active
    }

    mapping(address => AthleteToken) public tokens;
    mapping(address => mapping(address => uint256)) public holdings; // user => athlete => qty
    
    // ============ Events ============
    event AthleteRegistered(address indexed athlete, uint256 a, uint256 b, uint256 c);
    event TokensBought(address indexed buyer, address indexed athlete, uint256 qty, uint256 cost, uint256 newSupply);
    event TokensSold(address indexed seller, address indexed athlete, uint256 qty, uint256 payout, uint256 newSupply);
    event AthleteEarningsClaimed(address indexed athlete, uint256 amount);
    event TreasuryUpdated(address indexed newTreasury);
    event Paused(address account);
    event Unpaused(address account);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Modifiers ============
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Paused");
        _;
    }

    modifier nonReentrant() {
        require(!locked, "Reentrant call");
        locked = true;
        _;
        locked = false;
    }

    // ============ Constructor ============
    constructor(address _treasury) {
        require(_treasury != address(0), "Invalid treasury address");
        owner = msg.sender;
        treasuryWallet = _treasury;
    }

    // ============ Admin Functions ============
    
    /**
     * @notice Register a new athlete with bonding curve parameters
     * @param athlete The athlete's wallet address
     * @param a Quadratic coefficient (scaled by 1e18, e.g., 0.0002 = 2e14)
     * @param b Linear coefficient (scaled by 1e18, e.g., 0.02 = 2e16)
     * @param c Base price in MON (scaled by 1e18, e.g., 0.001 MON = 1e15)
     */
    function registerAthlete(
        address athlete,
        uint256 a,
        uint256 b,
        uint256 c
    ) external onlyOwner {
        require(athlete != address(0), "Invalid athlete address");
        require(!tokens[athlete].initialized, "Already registered");
        
        tokens[athlete] = AthleteToken({
            supply: 0,
            a: a,
            b: b,
            c: c,
            treasury: 0,
            athleteEarnings: 0,
            initialized: true
        });
        
        emit AthleteRegistered(athlete, a, b, c);
    }

    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid address");
        treasuryWallet = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    function pause() external onlyOwner {
        paused = true;
        emit Paused(msg.sender);
    }

    function unpause() external onlyOwner {
        paused = false;
        emit Unpaused(msg.sender);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid owner");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ============ Trading Functions ============

    /**
     * @notice Buy athlete tokens with native MON
     * @param athlete The athlete to buy tokens for
     * @param qty Number of tokens to buy (whole numbers)
     */
    function buy(
        address athlete,
        uint256 qty
    ) external payable nonReentrant whenNotPaused {
        require(qty > 0, "Quantity must be positive");
        require(tokens[athlete].initialized, "Athlete not registered");

        uint256 grossCost = costToBuy(athlete, qty);
        uint256 fee = (grossCost * FEE_BPS) / BPS_DENOMINATOR;
        uint256 totalCost = grossCost + fee;
        
        require(msg.value >= totalCost, "Insufficient MON sent");

        // Update state
        tokens[athlete].supply += qty;
        tokens[athlete].treasury += grossCost;
        
        // Distribute fees
        uint256 athleteFee = (fee * ATHLETE_FEE_BPS) / FEE_BPS;
        uint256 treasuryFee = fee - athleteFee;
        
        tokens[athlete].athleteEarnings += athleteFee;
        
        // Send treasury fee
        (bool treasurySent, ) = treasuryWallet.call{value: treasuryFee}("");
        require(treasurySent, "Treasury transfer failed");

        holdings[msg.sender][athlete] += qty;

        // Refund excess MON
        uint256 excess = msg.value - totalCost;
        if (excess > 0) {
            (bool refundSent, ) = msg.sender.call{value: excess}("");
            require(refundSent, "Refund failed");
        }

        emit TokensBought(msg.sender, athlete, qty, totalCost, tokens[athlete].supply);
    }

    /**
     * @notice Sell athlete tokens for native MON
     * @param athlete The athlete to sell tokens for
     * @param qty Number of tokens to sell
     * @param minPayout Minimum MON to receive (slippage protection)
     */
    function sell(
        address athlete,
        uint256 qty,
        uint256 minPayout
    ) external nonReentrant whenNotPaused {
        require(qty > 0, "Quantity must be positive");
        require(holdings[msg.sender][athlete] >= qty, "Insufficient balance");
        require(tokens[athlete].supply >= qty, "Insufficient supply");

        uint256 grossPayout = payoutToSell(athlete, qty);
        uint256 fee = (grossPayout * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - fee;
        
        require(netPayout >= minPayout, "Below min payout");
        require(tokens[athlete].treasury >= grossPayout, "Insufficient reserve");

        // Update state
        tokens[athlete].supply -= qty;
        tokens[athlete].treasury -= grossPayout;
        holdings[msg.sender][athlete] -= qty;

        // Distribute fees
        uint256 athleteFee = (fee * ATHLETE_FEE_BPS) / FEE_BPS;
        uint256 treasuryFee = fee - athleteFee;
        
        tokens[athlete].athleteEarnings += athleteFee;
        
        // Send treasury fee
        (bool treasurySent, ) = treasuryWallet.call{value: treasuryFee}("");
        require(treasurySent, "Treasury transfer failed");

        // Pay seller
        (bool sellerPaid, ) = msg.sender.call{value: netPayout}("");
        require(sellerPaid, "Seller payment failed");

        emit TokensSold(msg.sender, athlete, qty, netPayout, tokens[athlete].supply);
    }

    /**
     * @notice Athlete claims accumulated earnings in MON
     */
    function claimEarnings() external nonReentrant {
        uint256 earnings = tokens[msg.sender].athleteEarnings;
        require(earnings > 0, "No earnings to claim");

        tokens[msg.sender].athleteEarnings = 0;
        
        (bool sent, ) = msg.sender.call{value: earnings}("");
        require(sent, "Earnings transfer failed");

        emit AthleteEarningsClaimed(msg.sender, earnings);
    }

    // ============ View Functions ============

    /**
     * @notice Calculate instantaneous price at current supply
     * @dev price = a*s² + b*s + c (all scaled by 1e18)
     */
    function priceAt(address athlete) public view returns (uint256) {
        AthleteToken storage token = tokens[athlete];
        uint256 s = token.supply;
        
        return (token.a * s * s / PRECISION) + (token.b * s / PRECISION) + token.c;
    }

    /**
     * @notice Calculate cost to buy qty tokens in MON
     */
    function costToBuy(address athlete, uint256 qty) public view returns (uint256) {
        AthleteToken storage token = tokens[athlete];
        uint256 cost = 0;
        uint256 currentSupply = token.supply;
        
        for (uint256 i = 0; i < qty; i++) {
            uint256 s = currentSupply + i;
            cost += (token.a * s * s / PRECISION) + (token.b * s / PRECISION) + token.c;
        }
        
        return cost;
    }

    /**
     * @notice Calculate payout for selling qty tokens in MON
     */
    function payoutToSell(address athlete, uint256 qty) public view returns (uint256) {
        AthleteToken storage token = tokens[athlete];
        require(token.supply >= qty, "Insufficient supply");
        
        uint256 payout = 0;
        uint256 currentSupply = token.supply;
        
        for (uint256 i = 0; i < qty; i++) {
            uint256 s = currentSupply - i - 1;
            payout += (token.a * s * s / PRECISION) + (token.b * s / PRECISION) + token.c;
        }
        
        return payout;
    }

    /**
     * @notice Get user's holding for an athlete
     */
    function balanceOf(address user, address athlete) external view returns (uint256) {
        return holdings[user][athlete];
    }

    /**
     * @notice Get athlete token info
     */
    function getAthleteInfo(address athlete) external view returns (
        uint256 supply,
        uint256 currentPrice,
        uint256 treasury,
        uint256 athleteEarnings,
        bool initialized
    ) {
        AthleteToken storage token = tokens[athlete];
        return (
            token.supply,
            priceAt(athlete),
            token.treasury,
            token.athleteEarnings,
            token.initialized
        );
    }

    /**
     * @notice Allow contract to receive MON
     */
    receive() external payable {}
}
