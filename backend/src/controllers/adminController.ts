import { Request, Response } from "express";
import { poolPromise } from "../db";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// ----------------------------
// Admin Login
// ----------------------------
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const adminEmail    = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({ message: "Admin credentials not configured" });
    }

    if (email !== adminEmail) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const passwordMatch = await bcrypt.compare(password, adminPassword);
    if (!passwordMatch) {
      if (password !== adminPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    const token = jwt.sign(
      { role: "admin" },
      process.env.JWT_SECRET as string,
      { expiresIn: "8h" }
    );

    res.json({ token, role: "admin" });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Admin login failed" });
  }
};

// ----------------------------
// Get Stats Overview
// ✅ Added platform fees collected
// ----------------------------
export const getStats = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const [users, jobs, escrow, released, fees] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM users`),
      pool.query(`SELECT COUNT(*), status FROM jobs GROUP BY status`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM escrows`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'escrow_release'`),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS total FROM transactions WHERE type = 'platform_fee'`),
    ]);

    const jobsByStatus: Record<string, number> = {};
    jobs.rows.forEach((row: any) => {
      jobsByStatus[row.status] = Number(row.count);
    });

    res.json({
      totalUsers:         Number(users.rows[0].count),
      totalJobs:          jobs.rows.reduce((acc: number, r: any) => acc + Number(r.count), 0),
      jobsByStatus,
      totalEscrowVolume:  Number(escrow.rows[0].total),
      totalReleased:      Number(released.rows[0].total),
      totalPlatformFees:  Number(fees.rows[0].total),
      platformFeePercent: Number(process.env.PLATFORM_FEE_PERCENT ?? 10),
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

// ----------------------------
// Get All Jobs
// ----------------------------
export const getAllJobs = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const result = await pool.query(
      `SELECT j.*,
              c.name AS client_name,
              f.name AS freelancer_name
       FROM jobs j
       LEFT JOIN users c ON c.id = j.client_id
       LEFT JOIN users f ON f.id = j.freelancer_id
       ORDER BY j.created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ----------------------------
// Get All Disputes
// ----------------------------
export const getDisputes = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const result = await pool.query(
      `SELECT j.*,
              c.name AS client_name,
              f.name AS freelancer_name,
              e.amount AS escrow_amount
       FROM jobs j
       LEFT JOIN users c ON c.id = j.client_id
       LEFT JOIN users f ON f.id = j.freelancer_id
       LEFT JOIN escrows e ON e.job_id = j.id
       WHERE j.status = 'disputed'
       ORDER BY j.created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch disputes" });
  }
};

// ----------------------------
// Resolve Dispute
// ✅ Platform fee applied when resolved in favour of freelancer
// ----------------------------
export const resolveDispute = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const { jobId, inFavourOf } = req.body;

    if (!jobId || !inFavourOf) {
      return res.status(400).json({ message: "jobId and inFavourOf are required" });
    }

    if (inFavourOf !== "freelancer" && inFavourOf !== "client") {
      return res.status(400).json({ message: "inFavourOf must be 'freelancer' or 'client'" });
    }

    await client.query("BEGIN");

    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1 AND status = 'disputed'`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Disputed job not found" });
    }

    const escrowResult = await client.query(
      `SELECT * FROM escrows WHERE job_id = $1 AND status = 'funded'`,
      [jobId]
    );

    const escrow = escrowResult.rows[0];
    if (!escrow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Funded escrow not found for this job" });
    }

    const recipientId  = inFavourOf === "freelancer" ? job.freelancer_id : job.client_id;
    const newJobStatus = inFavourOf === "freelancer" ? "released" : "open";
    const grossAmount  = Number(escrow.amount);

    // ✅ Apply fee only when freelancer wins
    const feePercent = Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
    const feeAmount  = inFavourOf === "freelancer"
      ? parseFloat(((grossAmount * feePercent) / 100).toFixed(2))
      : 0;
    const netAmount  = parseFloat((grossAmount - feeAmount).toFixed(2));

    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [recipientId]
    );

    const wallet = walletResult.rows[0];
    if (!wallet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Recipient wallet not found" });
    }

    // Credit recipient net amount
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
      [netAmount, wallet.id]
    );

    // Release escrow
    await client.query(
      `UPDATE escrows SET status = 'released' WHERE id = $1`,
      [escrow.id]
    );

    // Update job status
    await client.query(
      `UPDATE jobs SET status = $1 WHERE id = $2`,
      [newJobStatus, jobId]
    );

    // Log escrow_release or refund
    const txnType = inFavourOf === "freelancer" ? "escrow_release" : "refund";
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, txnType, netAmount]
    );

    // ✅ Log platform_fee if freelancer wins
    if (feeAmount > 0) {
      await client.query(
        `INSERT INTO transactions (wallet_id, type, amount)
         VALUES ($1, $2, $3)`,
        [wallet.id, "platform_fee", feeAmount]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: `Dispute resolved in favour of ${inFavourOf}. Funds have been transferred.`
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to resolve dispute" });
  } finally {
    client.release();
  }
};

// ----------------------------
// Get All Transactions
// ----------------------------
export const getAllTransactions = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const result = await pool.query(
      `SELECT t.*,
              u.name AS user_name,
              u.email AS user_email
       FROM transactions t
       JOIN wallets w ON w.id = t.wallet_id
       JOIN users u ON u.id = w.user_id
       ORDER BY t.created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};