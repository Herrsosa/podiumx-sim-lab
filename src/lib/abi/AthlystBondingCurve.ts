export const ATHLYST_BONDING_CURVE_ABI = [
    "function registerAthlete(address athlete, uint256 a, uint256 b, uint256 c) external",
    "function buy(address athlete, uint256 qty) external payable",
    "function sell(address athlete, uint256 qty, uint256 minPayout) external",
    "function getAthleteInfo(address athlete) external view returns (uint256 supply, uint256 currentPrice, uint256 treasury, uint256 athleteEarnings, bool initialized)",
    "function costToBuy(address athlete, uint256 qty) public view returns (uint256)",
    "function payoutToSell(address athlete, uint256 qty) public view returns (uint256)",
    "function balanceOf(address athlete, address holder) external view returns (uint256)",
    "event TokensBought(address indexed buyer, address indexed athlete, uint256 qty, uint256 cost, uint256 newSupply)",
    "event TokensSold(address indexed seller, address indexed athlete, uint256 qty, uint256 payout, uint256 newSupply)"
];
