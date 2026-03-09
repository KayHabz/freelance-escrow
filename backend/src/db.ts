import { Pool } from "pg";
import * as dotenv from "dotenv";

dotenv.config();

// Validate environment variables
const requiredEnvVars = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});

// On some networks the DNS for Supabase returns an IPv6 address and the
// container doesn’t have IPv6 connectivity, which results in an
// ENETUNREACH error when the pool attempts to connect.  We resolve the
// hostname ourselves forcing family:4 (IPv4) and then build the pool with
// the numeric address.  This avoids the runtime error seen in development
// (`DB connection error: Error: connect ENETUNREACH …`).

import dns from "dns";

async function createPool(): Promise<Pool> {
  // lookup returns an object with { address, family }
  const { address } = await dns.promises.lookup(
    process.env.DB_HOST as string,
    { family: 4 }
  );

  // Resolve the hostname to IPv4 to avoid ENETUNREACH errors on systems
  // without IPv6 connectivity. The container may not have IPv6 routes, so
  // we force DNS resolution to IPv4 and use the numeric address for connection.
  const pool = new Pool({
    host: address,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER as string,
    password: process.env.DB_PASSWORD as string,
    database: process.env.DB_NAME as string,
    ssl: { rejectUnauthorized: false }, // Supabase requires SSL
  });

  try {
    await pool.connect();
    console.log("Connected to Supabase ✅ (IPv4)");
  } catch (err: any) {
    console.error("DB connection error:", err);
  }

  return pool;
}

// export a promise so callers can await the pool being ready
export const poolPromise = createPool();