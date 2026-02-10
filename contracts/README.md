# Athlyst On-Chain Bonding Curve

Smart contract for athlete token trading using a quadratic bonding curve on **Monad Mainnet**.

## Formula

```
price(s) = a*s² + b*s + c
```

Where:
- `s` = current supply
- `a` = 0.0002 (quadratic coefficient)
- `b` = 0.02 (linear coefficient)  
- `c` = 1 MON (base price)

## Fees

- **Total**: 3%
- **Athlete (Issuer)**: 1.5% (claimable via `claimEarnings()`)
- **Protocol Treasury**: 1.5%

## Reserve Currency

Uses **native MON**. No token approvals are required. Users send MON directly with the `buy` transaction.

## Contract Addresses

| Layer | Network | Address |
|-------|---------|---------|
| **Bonding Curve** | Monad Mainnet | `0xA87F1E8EE6bC24D628f9C5d03e8736e5bF32c809` |
| **Treasury** | Monad Mainnet | `0x897FE482AcB4633967D1BEf8a471EE59d71BE56F` |

## Setup & Deployment

### Build & Test

```bash
cd contracts
forge build
forge test -vvv
```

### Deploy to Monad Mainnet

```bash
source .env
forge script script/Deploy.s.sol:DeployBondingCurve \
  --rpc-url https://rpc-mainnet.monadscan.com \
  --broadcast \
  --verify
```

## Architecture

```
AthlystBondingCurve
├── registerAthlete(address, a, b, c)  # Admin only
├── buy(athlete, qty) payable           # Send MON to buy
├── sell(athlete, qty, minPayout)       # Receive MON on sell
├── claimEarnings()                     # Athlete claims fees
├── priceAt(athlete)                    # View current price
├── costToBuy(athlete, qty)             # View buy cost
└── payoutToSell(athlete, qty)          # View sell payout
```

## Security

- ReentrancyGuard for all value transfers.
- Slippage protection on `sell`.
- Ownable for admin registration.
- Checks-effects-interactions pattern.
