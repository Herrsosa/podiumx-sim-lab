// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
    address private _owner;

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    constructor() {
        _owner = msg.sender;
        emit OwnershipTransferred(address(0), _owner);
    }

    function owner() public view returns (address) {
        return _owner;
    }

    modifier onlyOwner() {
        require(_owner == msg.sender, "Ownable: caller is not the owner");
        _;
    }

    function transferOwnership(address newOwner) public onlyOwner {
        require(newOwner != address(0), "Ownable: new owner is the zero address");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

/**
 * @title ReentrancyGuard
 * @dev Contract module that helps prevent reentrant calls to a function.
 */
contract ReentrancyGuard {
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    constructor() {
        _status = _NOT_ENTERED;
    }

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/**
 * @title AthlystBondingCurveV2
 * @notice Fixed bonding curve with corrected pricing precision for low supply.
 * @dev Replaces the V1 contract which had integer division truncation issues.
 */
contract AthlystBondingCurveV2 is Ownable, ReentrancyGuard {
    address public treasury;

    uint256 public constant FEE_BPS = 300; // 3%
    uint256 public constant BPS_DENOMINATOR = 10000;

    struct AthleteInfo {
        uint256 supply;
        uint256 a;
        uint256 b;
        uint256 c;
        uint256 treasuryBalance; // Funds reserved for sellers (bonding curve reserve)
        uint256 athleteEarnings; // Fees accumulated for the athlete
        bool initialized;
    }

    mapping(address => AthleteInfo) public athletes;
    mapping(address => mapping(address => uint256)) public balances; // athlete => holder => balance

    event AthleteRegistered(address indexed athlete, uint256 a, uint256 b, uint256 c);
    event TokensBought(address indexed buyer, address indexed athlete, uint256 qty, uint256 cost, uint256 newSupply);
    event TokensSold(address indexed seller, address indexed athlete, uint256 qty, uint256 payout, uint256 newSupply);
    event EarningsClaimed(address indexed athlete, uint256 amount);
    event TreasuryUpdated(address newTreasury);

    constructor(address _treasury) {
        treasury = _treasury;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // --- Core Pricing Logic ---

    // V2 FIX: Removed division by 1e18 to prevent truncation.
    // Inputs a, b, c are expected to be 18-decimal fixed point values relative to 1 MON
    // but the formula treats them as coefficients for the resulting price in WEI.
    //
    // Example: a=0.0002 MON (2e14 wei). s=1.
    // Result: 2e14 * 1 * 1 = 2e14 wei (0.0002 MON). Correct.
    function priceAt(uint256 supply, uint256 a, uint256 b, uint256 c) public pure returns (uint256) {
        return (a * supply * supply) + (b * supply) + c;
    }

    function costToBuy(address athlete, uint256 qty) public view returns (uint256) {
        AthleteInfo storage info = athletes[athlete];
        require(info.initialized, "Athlete not initialized");

        uint256 cost = 0;
        for (uint256 i = 0; i < qty; i++) {
            // Price at current supply + i
            cost += priceAt(info.supply + i, info.a, info.b, info.c);
        }
        return cost;
    }

    function payoutToSell(address athlete, uint256 qty) public view returns (uint256) {
        AthleteInfo storage info = athletes[athlete];
        require(info.initialized, "Athlete not initialized");
        require(info.supply >= qty, "Insufficient supply");

        uint256 payout = 0;
        for (uint256 i = 0; i < qty; i++) {
             // Price at current supply - 1 - i
            payout += priceAt(info.supply - 1 - i, info.a, info.b, info.c);
        }
        return payout;
    }

    function getAthleteInfo(address athlete) external view returns (
        uint256 supply, 
        uint256 currentPrice, 
        uint256 treasuryBalance, 
        uint256 athleteEarnings, 
        bool initialized
    ) {
        AthleteInfo storage info = athletes[athlete];
        if (!info.initialized) return (0, 0, 0, 0, false);
        
        uint256 price = priceAt(info.supply, info.a, info.b, info.c);
        return (info.supply, price, info.treasuryBalance, info.athleteEarnings, true);
    }

    function balanceOf(address athlete, address holder) external view returns (uint256) {
        return balances[athlete][holder];
    }

    // --- Actions ---

    function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external onlyOwner {
        require(!athletes[athlete].initialized, "Already initialized");
        
        athletes[athlete] = AthleteInfo({
            supply: 0,
            a: a,
            b: b,
            c: c,
            treasuryBalance: 0,
            athleteEarnings: 0,
            initialized: true
        });

        emit AthleteRegistered(athlete, a, b, c);
    }

    function buy(address athlete, uint256 qty) external payable nonReentrant {
        AthleteInfo storage info = athletes[athlete];
        require(info.initialized, "Athlete not initialized");
        require(qty > 0, "Qty must be > 0");

        uint256 grossCost = costToBuy(athlete, qty);
        uint256 fee = (grossCost * FEE_BPS) / BPS_DENOMINATOR;
        uint256 totalCost = grossCost + fee;

        require(msg.value >= totalCost, "Insufficient payment");

        // Split fee 50/50 between protocol and athlete
        uint256 athleteShare = fee / 2;
        uint256 protocolShare = fee - athleteShare;

        // Update state
        info.supply += qty;
        info.treasuryBalance += grossCost;
        info.athleteEarnings += athleteShare;
        balances[athlete][msg.sender] += qty;

        // Send protocol share to treasury wallet immediately
        (bool sent, ) = treasury.call{value: protocolShare}("");
        require(sent, "Failed to send protocol fee");

        // Refund excess
        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{value: msg.value - totalCost}("");
            require(refunded, "Refund failed");
        }

        emit TokensBought(msg.sender, athlete, qty, totalCost, info.supply);
    }

    function sell(address athlete, uint256 qty, uint256 minPayout) external nonReentrant {
        AthleteInfo storage info = athletes[athlete];
        require(info.initialized, "Athlete not initialized");
        require(qty > 0, "Qty must be > 0");
        require(balances[athlete][msg.sender] >= qty, "Insufficient balance");
        require(info.supply >= qty, "Insufficient supply");

        uint256 grossPayout = payoutToSell(athlete, qty);
        uint256 fee = (grossPayout * FEE_BPS) / BPS_DENOMINATOR;
        uint256 netPayout = grossPayout - fee;

        require(netPayout >= minPayout, "Slippage too high");
        require(address(this).balance >= netPayout, "Contract insolvent"); // Should be covered by treasuryBalance logic but safe to check
        // Check reserve logic: treasuryBalance stores accumulated gross amounts from buys minus payouts.
        // It SHOULD be enough if curves are symmetric.
        // Wait, priceAt supply-1-i for sells ensures symmetry.
        require(info.treasuryBalance >= grossPayout, "Athlete reserve insufficient"); 

        // Split fee
        uint256 athleteShare = fee / 2;
        uint256 protocolShare = fee - athleteShare;

        // Update state
        info.supply -= qty;
        info.treasuryBalance -= grossPayout; 
        info.athleteEarnings += athleteShare;
        balances[athlete][msg.sender] -= qty;

        // Send protocol share
        (bool sentProtocol, ) = treasury.call{value: protocolShare}("");
        require(sentProtocol, "Failed to send protocol fee");

        // Send payout to user
        (bool sentUser, ) = payable(msg.sender).call{value: netPayout}("");
        require(sentUser, "Failed to send payout");

        emit TokensSold(msg.sender, athlete, qty, netPayout, info.supply);
    }

    function claimEarnings(address athlete) external nonReentrant {
        // Anyone can call this to push earnings to the athlete's wallet ID
        // (The 'athlete' address IS the wallet address in this system)
        AthleteInfo storage info = athletes[athlete];
        uint256 amount = info.athleteEarnings;
        require(amount > 0, "No earnings");

        info.athleteEarnings = 0;
        
        (bool sent, ) = payable(athlete).call{value: amount}("");
        require(sent, "Transfer failed");

        emit EarningsClaimed(athlete, amount);
    }
}
