import { Request, Response } from "express";
import { poolPromise } from "../db";

// ----------------------------
// Deposit Funds
// ----------------------------
export const depositFunds = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const { amount } = req.body;

    if (amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    await client.query("BEGIN");

    // Get wallet
    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    const wallet = walletResult.rows[0];

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Update balance
    const updatedWallet = await client.query(
      `UPDATE wallets
       SET balance = balance + $1
       WHERE id = $2
       RETURNING balance`,
      [amount, wallet.id]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, "deposit", amount]
    );

    await client.query("COMMIT");

    res.json({
      message: "Deposit successful",
      balance: updatedWallet.rows[0].balance
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Deposit failed" });
  } finally {
    client.release();
  }
};

// ----------------------------
// Get Wallet Balance
// ----------------------------
export const getBalance = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  try {
    const userId = (req as any).user.userId;

    const result = await pool.query(
      `SELECT balance FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    res.json({ balance: result.rows[0].balance });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch balance" });
  }
};

// ----------------------------
// Get Transaction History
// ----------------------------
export const getTransactions = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  try {
    const userId = (req as any).user.userId;

    // Get wallet
    const walletResult = await pool.query(
      `SELECT id FROM wallets WHERE user_id = $1`,
      [userId]
    );

    if (walletResult.rows.length === 0) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const walletId = walletResult.rows[0].id;

    // Fetch transactions
    const transactionsResult = await pool.query(
      `SELECT id, type, amount, created_at
       FROM transactions
       WHERE wallet_id = $1
       ORDER BY created_at DESC`,
      [walletId]
    );

    res.json({ transactions: transactionsResult.rows });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not fetch transactions" });
  }
};