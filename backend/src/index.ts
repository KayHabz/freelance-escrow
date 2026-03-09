import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import { poolPromise } from "./db"; // asynchronous pool that has IPv4-only host resolution

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const result = await pool.query("SELECT NOW()");
    res.json({ message: "Server is running!", time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT} ✅`));

import userRoutes from "./routes/userRoutes";
app.use("/api/users", userRoutes);

import authRoutes from "./routes/authRoutes";
app.use("/api/auth", authRoutes);

import walletRoutes from "./routes/walletRoutes";
app.use("/api/wallet", walletRoutes);

import jobRoutes from "./routes/jobRoutes";
app.use("/api/jobs", jobRoutes);

import escrowRoutes from "./routes/escrowRoutes";
app.use("/api/escrow", escrowRoutes);

import { authenticateToken } from "./middlewares/authMiddleware";

app.get("/api/profile", authenticateToken, (req, res) => {
  res.json({
    message: "Protected route accessed",
    user: (req as any).user
  });
});