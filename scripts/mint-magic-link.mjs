#!/usr/bin/env node
/**
 * Mint a magic-link callback URL for a user (verification tooling).
 * Usage: node scripts/mint-magic-link.mjs <email> <origin> [nextPath]
 * Prints: <origin>/auth/callback?token_hash=…&type=magiclink&next=<nextPath>
 *
 * Lives in the repo (not the scratchpad) because node must resolve
 * @supabase/supabase-js from local node_modules. Reads the service key from
 * .env.local. Never prints the key.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const [email, origin, nextPath = "/dashboard"] = process.argv.slice(2);
if (!email || !origin) {
  console.error("usage: mint-magic-link.mjs <email> <origin> [nextPath]");
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
if (error) {
  console.error("generateLink failed:", error.message);
  process.exit(1);
}
const hash = data.properties.hashed_token;
console.log(`${origin}/auth/callback?token_hash=${hash}&type=magiclink&next=${encodeURIComponent(nextPath)}`);
