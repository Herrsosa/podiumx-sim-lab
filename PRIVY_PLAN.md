# Privy Integration Plan

## Objective
Integrate Privy to provide embedded smart wallets for athletes and users, enabling on-chain trades and USD on-ramping without complex crypto setup.

## Phase 1: Setup & Configuration
- [x] Install Privy SDK: `npm install @privy-io/react-auth`
- [x] User to provide `VITE_PRIVY_APP_ID` (Sign up at [console.privy.io](https://console.privy.io/)).
- [x] Configure `PrivyProvider` in `src/main.tsx` (or `src/App.tsx`).

## Phase 2: Wallet Integration
- [x] Create `PrivyWalletContext` or simple hooks to manage wallet state.
- [x] Implement a "Connect Wallet" / "Dashboard" component for users to view their embedded wallet.
- [x] Add "Fund Wallet" button using Privy's on-ramp interface.

## Phase 3: Smart Contract Interaction (Trade Execution)
- [ ] Update `WalletService` or create `OnChainWalletService`.
- [ ] Implement `buy` and `sell` functions using the Privy signer (EIP-1193 provider).
- [ ] Replace `mockSigner` logic with real transaction submission when Privy is active.

## Phase 4: Verification
- [ ] Test login/connect flow.
- [ ] Test on-ramp flow (simulated).
- [ ] Test buying a token on testnet/Monad devnet.
