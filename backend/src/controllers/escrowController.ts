import { Request, Response } from "express";
import { poolPromise } from "../db";

// Fund a job (hold in escrow)
export const fundJob = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const { jobId } = req.body;

    await client.query("BEGIN");

    // Get job
    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    const amount = job.budget;

    // Get client wallet
    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    const wallet = walletResult.rows[0];
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Deduct client wallet balance
    await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
      [amount, wallet.id]
    );

    // Create escrow
    await client.query(
      `INSERT INTO escrows (job_id, client_id, amount)
       VALUES ($1, $2, $3)`,
      [jobId, userId, amount]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, "escrow_funding", amount]
    );

    await client.query("COMMIT");

    res.json({
      message: "Job funded successfully"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Escrow funding failed" });
  } finally {
    client.release();
  }
};

// Release escrow to freelancer
export const releaseEscrow = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const { escrowId } = req.body;

    await client.query("BEGIN");

    // Get escrow
    const escrowResult = await client.query(
      `SELECT * FROM escrows WHERE id = $1`,
      [escrowId]
    );

    const escrow = escrowResult.rows[0];
    if (!escrow) {
      return res.status(404).json({ message: "Escrow not found" });
    }

    // Get job to find assigned freelancer
    const jobResult = await client.query(
      `SELECT freelancer_id FROM jobs WHERE id = $1`,
      [escrow.job_id]
    );

    const freelancerId = jobResult.rows[0]?.freelancer_id;
    if (!freelancerId) {
      return res.status(400).json({ message: "No freelancer assigned to job" });
    }

    // Get freelancer wallet
    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [freelancerId]
    );

    const wallet = walletResult.rows[0];
    if (!wallet) {
      return res.status(404).json({ message: "Freelancer wallet not found" });
    }

    // Add funds to freelancer wallet
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
      [escrow.amount, wallet.id]
    );

    // Mark escrow as released
    await client.query(
      `UPDATE escrows SET status = 'released' WHERE id = $1`,
      [escrowId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Escrow released to freelancer"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Escrow release failed" });
  } finally {
    client.release();
  }
};