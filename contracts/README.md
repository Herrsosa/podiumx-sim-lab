# Athlyst On-Chain Bonding Curve (Monad)

Smart contract for athlete token trading using a quadratic bonding curve on **Monad**.

## Formula

```
price(s) = a*s² + b*s + c
```

Where:
- `s` = current supply
- `a` = 0.0002 (quadratic coefficient)
- `b` = 0.02 (linear coefficient)  
- `c` = 0.001 MON (base price)

## Fees

- **Total**: 3%
- **Athlete**: 1.5%
- **Treasury**: 1.5%

## Reserve Currency

Uses **native MON** (not USDC). This means:
- No token approvals needed before trading
- Users just send MON directly with the buy transaction
- Simpler UX, but prices are volatile in USD terms

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd contracts
forge install foundry-rs/forge-std
forge install OpenZeppelin/openzeppelin-contracts

# Copy environment file
cp .env.example .env
# Edit .env with your keys
```

## Build & Test

```bash
forge build
forge test -vvv
```

## Deploy

### Monad Testnet

```bash
source .env
forge script script/Deploy.s.sol:DeployBondingCurve \
  --rpc-url $MONAD_TESTNET_RPC_URL \
  --broadcast
```

### Monad Mainnet (when available)

```bash
source .env
forge script script/Deploy.s.sol:DeployBondingCurve \
  --rpc-url $MONAD_MAINNET_RPC_URL \
  --broadcast \
  --verify
```

## Contract Addresses

| Network | Address |
|---------|---------|
| Monad Testnet | TBD |
| Monad Mainnet | TBD |

## Related Contracts

| Contract | Address | Network |
|----------|---------|---------|
| AthlystLogger | `0xa87f1e8ee6bc24d628f9c5d03e8736e5bf32c809` | Monad Testnet |
| AthlystBondingCurve | `0x9066E90d9d5DEBC9c75FFBA729feCC162Ea2601F` | Monad Testnet |

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

- ReentrancyGuard on all state-changing functions
- Pausable for emergency stops
- Slippage protection (minPayout on sell)
- Ownable for admin functions
- Checks-effects-interactions pattern for MON transfers
