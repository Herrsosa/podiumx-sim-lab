import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { formatMoney } from '../src/lib/format';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('formatMoney uses SOL and preserves invalid placeholder rendering', () => {
  assert.equal(formatMoney(12.5), '12.5 SOL');
  assert.equal(formatMoney(Number.NaN), '—');
});

test('execute-trade returns wallet.sol and uses SOL in insufficient balance copy', () => {
  const source = read('../supabase/functions/execute-trade/index.ts');

  assert.match(source, /wallet:\s*\{\s*sol:\s*walletBalance/s);
  assert.doesNotMatch(source, /wallet:\s*\{\s*mon:\s*walletBalance/s);
  assert.match(source, /Insufficient SOL balance/);
  assert.doesNotMatch(source, /Insufficient MON balance/);
});

test('wallet debug no longer attempts to fund a wallet with an empty address', () => {
  const source = read('../src/components/SmartWallet/WalletDebug.tsx');

  assert.doesNotMatch(source, /fundWallet\(/);
  assert.doesNotMatch(source, /address\s*\|\|\s*''/);
});
