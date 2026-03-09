"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.poolPromise = void 0;
const pg_1 = require("pg");
const dotenv = __importStar(require("dotenv"));
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
const dns_1 = __importDefault(require("dns"));
async function createPool() {
    // lookup returns an object with { address, family }
    const { address } = await dns_1.default.promises.lookup(process.env.DB_HOST, { family: 4 });
    // Resolve the hostname to IPv4 to avoid ENETUNREACH errors on systems
    // without IPv6 connectivity. The container may not have IPv6 routes, so
    // we force DNS resolution to IPv4 and use the numeric address for connection.
    const pool = new pg_1.Pool({
        host: address,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: { rejectUnauthorized: false }, // Supabase requires SSL
    });
    try {
        await pool.connect();
        console.log("Connected to Supabase ✅ (IPv4)");
    }
    catch (err) {
        console.error("DB connection error:", err);
    }
    return pool;
}
// export a promise so callers can await the pool being ready
exports.poolPromise = createPool();
//# sourceMappingURL=db.js.map