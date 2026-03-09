import express from "express";
import { depositFunds, getBalance, getTransactions } from "../controllers/walletController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// Deposit funds
router.post("/deposit", authenticateToken, depositFunds);

// Get wallet balance
router.get("/balance", authenticateToken, getBalance);

// Get transaction history
router.get("/transactions", authenticateToken, getTransactions);

export default router;