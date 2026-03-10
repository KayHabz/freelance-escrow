import { Request, Response } from "express";
import { poolPromise } from "../db";

// ----------------------------
// Fund a Job (hold in escrow)
// ----------------------------
export const fundJob = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    await client.query("BEGIN");

    // Get job
    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Job not found" });
    }

    // ✅ Verify job belongs to the calling client
    if (job.client_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You do not own this job" });
    }

    // ✅ Prevent double funding
    const existingEscrow = await client.query(
      `SELECT id FROM escrows WHERE job_id = $1`,
      [jobId]
    );
    if (existingEscrow.rows.length > 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Job is already funded" });
    }

    // ✅ Verify job is in a fundable state
    if (job.status !== "open") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: `Job cannot be funded in status: ${job.status}` });
    }

    const amount = job.budget;

    // Get client wallet
    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [userId]
    );

    const wallet = walletResult.rows[0];
    if (!wallet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Wallet not found" });
    }

    // ✅ Check sufficient balance
    if (Number(wallet.balance) < Number(amount)) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Insufficient funds" });
    }

    // Deduct client wallet balance
    await client.query(
      `UPDATE wallets SET balance = balance - $1 WHERE id = $2`,
      [amount, wallet.id]
    );

    // Create escrow record
    await client.query(
      `INSERT INTO escrows (job_id, client_id, amount, status)
       VALUES ($1, $2, $3, 'funded')`,
      [jobId, userId, amount]
    );

    // ✅ Update job status to funded
    await client.query(
      `UPDATE jobs SET status = 'funded' WHERE id = $1`,
      [jobId]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, "escrow_funding", amount]
    );

    await client.query("COMMIT");

    res.json({ message: "Job funded successfully" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Escrow funding failed" });
  } finally {
    client.release();
  }
};

// ----------------------------
// Release Escrow to Freelancer
// ----------------------------
export const releaseEscrow = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const { escrowId } = req.body;

    if (!escrowId) {
      return res.status(400).json({ message: "escrowId is required" });
    }

    await client.query("BEGIN");

    // Get escrow
    const escrowResult = await client.query(
      `SELECT * FROM escrows WHERE id = $1`,
      [escrowId]
    );

    const escrow = escrowResult.rows[0];
    if (!escrow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Escrow not found" });
    }

    // ✅ Verify caller is the client who funded this escrow
    if (escrow.client_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Only the client can release escrow" });
    }

    // ✅ Prevent double release
    if (escrow.status === "released") {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "Escrow has already been released" });
    }

    // Get job to find assigned freelancer
    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [escrow.job_id]
    );

    const job = jobResult.rows[0];
    const freelancerId = job?.freelancer_id;

    if (!freelancerId) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "No freelancer assigned to this job" });
    }

    // Get freelancer wallet
    const freelancerWallet = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [freelancerId]
    );

    const wallet = freelancerWallet.rows[0];
    if (!wallet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Freelancer wallet not found" });
    }

    // Credit freelancer wallet
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
      [escrow.amount, wallet.id]
    );

    // Mark escrow as released
    await client.query(
      `UPDATE escrows SET status = 'released' WHERE id = $1`,
      [escrowId]
    );

    // ✅ Update job status to released
    await client.query(
      `UPDATE jobs SET status = 'released' WHERE id = $1`,
      [escrow.job_id]
    );

    // ✅ Log transaction for freelancer
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, "escrow_release", escrow.amount]
    );

    await client.query("COMMIT");

    res.json({ message: "Escrow released to freelancer" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Escrow release failed" });
  } finally {
    client.release();
  }
};