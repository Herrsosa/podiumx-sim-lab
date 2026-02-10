type MonadNetworkConfig = {
  chainId: number;
  rpcUrl: string;
  explorerUrl: string; // Base URL (no trailing slash), used to build /tx/<hash> links.
};

function cleanBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function readEnv(name: string): string | null {
  const raw = Deno.env.get(name);
  if (!raw) return null;
  const trimmed = raw.trim();
  return trimmed.length ? trimmed : null;
}

function requireEnv(name: string): string {
  const value = readEnv(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getMonadNetworkConfig(): MonadNetworkConfig {
  // Never silently default chain config for agent trading.
  // If these are missing, callers should fail loudly rather than produce txs on the wrong network.
  const chainIdRaw = requireEnv("MONAD_CHAIN_ID");
  const chainId = Number(chainIdRaw);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    throw new Error(`Invalid MONAD_CHAIN_ID: ${chainIdRaw}`);
  }

  const rpcUrl = requireEnv("MONAD_RPC_URL");
  const explorerUrl = cleanBaseUrl(readEnv("MONAD_EXPLORER_URL") || "https://monadscan.com");

  return { chainId, rpcUrl, explorerUrl };
}

export function getMonadExplorerUrl(): string {
  return cleanBaseUrl(readEnv("MONAD_EXPLORER_URL") || "https://monadscan.com");
}

export function getMonadBondingCurveAddress(): string {
  return requireEnv("MONAD_BONDING_CURVE_ADDRESS");
}

export function getMonadLoggerAddress(): string | null {
  return readEnv("MONAD_LOGGER_ADDRESS");
}

export function getMonadRpcUrl(): string | null {
  return readEnv("MONAD_RPC_URL");
}

export function buildExplorerTxUrl(explorerBaseUrl: string, txHash: string): string {
  return `${cleanBaseUrl(explorerBaseUrl)}/tx/${txHash}`;
}
