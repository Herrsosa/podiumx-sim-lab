import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

type ProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  type: string | null;
  monad_wallet_address: string | null;
};

type TokenRow = {
  athlete_id: string;
  symbol: string | null;
};

type WalletMappingRecord = {
  athlete_id: string;
  username: string;
  display_name: string;
  type: string;
  token_symbol: string;
  monad_wallet_address: string;
  is_tradeable: boolean;
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const MONAD_CHAIN_ID = Number(process.env.MONAD_CHAIN_ID || "143");
const MONAD_NETWORK_NAME =
  process.env.MONAD_NETWORK_NAME || (MONAD_CHAIN_ID === 143 ? "Monad Mainnet" : "Monad");

if (!Number.isInteger(MONAD_CHAIN_ID) || MONAD_CHAIN_ID <= 0) {
  throw new Error(`Invalid MONAD_CHAIN_ID: ${process.env.MONAD_CHAIN_ID ?? ""}`);
}

function toCsv(rows: WalletMappingRecord[]): string {
  const header = [
    "athlete_id",
    "username",
    "display_name",
    "type",
    "token_symbol",
    "monad_wallet_address",
    "is_tradeable",
  ];
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.athlete_id,
        row.username,
        row.display_name,
        row.type,
        row.token_symbol,
        row.monad_wallet_address,
        String(row.is_tradeable),
      ]
        .map(escape)
        .join(",")
    );
  }

  return `${lines.join("\n")}\n`;
}

async function main(): Promise<void> {
  const outDir = path.resolve(process.cwd(), "artifacts");
  const jsonPath = path.join(outDir, "demo-athlete-wallet-mapping.json");
  const csvPath = path.join(outDir, "demo-athlete-wallet-mapping.csv");

  const [{ data: profiles, error: profileError }, { data: tokens, error: tokenError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, type, monad_wallet_address")
        .order("username", { ascending: true }),
      supabase.from("athlete_tokens").select("athlete_id, symbol"),
    ]);

  if (profileError) {
    throw new Error(`Failed to fetch profiles: ${profileError.message}`);
  }
  if (tokenError) {
    throw new Error(`Failed to fetch athlete_tokens: ${tokenError.message}`);
  }

  const tokenMap = new Map<string, TokenRow>(
    (tokens || []).map((token) => [token.athlete_id, token] as const)
  );

  const records: WalletMappingRecord[] = (profiles || [])
    .filter((profile: ProfileRow) => tokenMap.has(profile.id))
    .filter((profile: ProfileRow) => Boolean(profile.monad_wallet_address))
    .map((profile: ProfileRow) => {
      const token = tokenMap.get(profile.id);
      return {
        athlete_id: profile.id,
        username: profile.username || "",
        display_name: profile.display_name || "",
        type: profile.type || "human",
        token_symbol: token?.symbol || "",
        monad_wallet_address: (profile.monad_wallet_address || "").toLowerCase(),
        is_tradeable: true,
      };
    })
    .sort((a, b) => a.username.localeCompare(b.username));

  const payload = {
    generated_at: new Date().toISOString(),
    network: MONAD_NETWORK_NAME,
    chain_id: MONAD_CHAIN_ID,
    count: records.length,
    athletes: records,
  };

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");
  fs.writeFileSync(csvPath, toCsv(records), "utf8");

  console.log(`Exported ${records.length} athlete wallet mappings.`);
  console.log(`JSON: ${jsonPath}`);
  console.log(`CSV:  ${csvPath}`);
}

main().catch((error) => {
  console.error("Export failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
