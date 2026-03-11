import { Request, Response } from "express";
import { poolPromise } from "../db";

// ----------------------------
// Create Job (Client only)
// ----------------------------
export const createJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const clientId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "client") {
      return res.status(403).json({ message: "Only clients can create jobs" });
    }

    const { title, description, budget } = req.body;

    if (!title || !budget) {
      return res.status(400).json({ message: "Title and budget are required" });
    }

    if (Number(budget) <= 0) {
      return res.status(400).json({ message: "Budget must be greater than 0" });
    }

    const result = await pool.query(
      `INSERT INTO jobs (client_id, title, description, budget, status)
       VALUES ($1, $2, $3, $4, 'open')
       RETURNING *`,
      [clientId, title, description, budget]
    );

    res.status(201).json({
      message: "Job created successfully",
      job: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create job" });
  }
};

// ----------------------------
// Get All Funded Jobs (visible to freelancers)
// ✅ Changed: status = 'funded' so freelancers only
//    see jobs where escrow is already secured
// ----------------------------
export const getJobs = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const result = await pool.query(
      `SELECT * FROM jobs WHERE status = 'funded' ORDER BY created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ----------------------------
// Get Job by ID
// ----------------------------
export const getJobById = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const jobId = req.params.id;

    const result = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Job not found" });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch job" });
  }
};

// ----------------------------
// Get My Jobs (Client only)
// ✅ JOIN with users to get freelancer_name
// ----------------------------
export const getMyJobs = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const clientId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "client") {
      return res.status(403).json({ message: "Only clients can access this" });
    }

    const result = await pool.query(
      `SELECT j.*,
              u.name AS freelancer_name
       FROM jobs j
       LEFT JOIN users u ON u.id = j.freelancer_id
       WHERE j.client_id = $1
       ORDER BY j.created_at DESC`,
      [clientId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

// ----------------------------
// Get Job Applications (Client only)
// ----------------------------
export const getJobApplications = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const clientId = (req as any).user.userId;
    const role = (req as any).user.role;
    const jobId = req.params.id;

    if (role !== "client") {
      return res.status(403).json({ message: "Only clients can view applications" });
    }

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1 AND client_id = $2`,
      [jobId, clientId]
    );

    if (jobResult.rows.length === 0) {
      return res.status(403).json({ message: "Job not found or access denied" });
    }

    const result = await pool.query(
      `SELECT ja.*, u.name AS freelancer_name
       FROM job_applications ja
       JOIN users u ON u.id = ja.freelancer_id
       WHERE ja.job_id = $1
       ORDER BY ja.created_at DESC`,
      [jobId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};

// ----------------------------
// Apply to Job (Freelancer only)
// ✅ Changed: accepts applications on 'funded' jobs
// ----------------------------
export const applyToJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const freelancerId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can apply to jobs" });
    }

    const { jobId, proposal } = req.body;

    if (!jobId || !proposal) {
      return res.status(400).json({ message: "jobId and proposal are required" });
    }

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    // ✅ Only funded jobs accept applications
    if (job.status !== "funded") {
      return res.status(400).json({
        message: `Job is not available for applications (status: ${job.status})`
      });
    }

    if (job.client_id === freelancerId) {
      return res.status(403).json({ message: "You cannot apply to your own job" });
    }

    const existing = await pool.query(
      `SELECT id FROM job_applications WHERE job_id = $1 AND freelancer_id = $2`,
      [jobId, freelancerId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "You have already applied to this job" });
    }

    const result = await pool.query(
      `INSERT INTO job_applications (job_id, freelancer_id, proposal)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [jobId, freelancerId, proposal]
    );

    res.status(201).json({
      message: "Application submitted successfully",
      application: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to apply to job" });
  }
};

// ----------------------------
// Accept Application (Client only)
// ----------------------------
export const acceptApplication = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "client") {
      return res.status(403).json({ message: "Only clients can accept applications" });
    }

    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ message: "applicationId is required" });
    }

    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT * FROM job_applications WHERE id = $1`,
      [applicationId]
    );

    const application = applicationResult.rows[0];
    if (!application) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Application not found" });
    }

    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [application.job_id]
    );

    const job = jobResult.rows[0];
    if (job.client_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You do not own this job" });
    }

    if (job.status !== "funded") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Job must be funded before accepting an application (current status: ${job.status})`
      });
    }

    // Reject all other applications
    await client.query(
      `UPDATE job_applications
       SET status = 'rejected'
       WHERE job_id = $1 AND id != $2`,
      [application.job_id, applicationId]
    );

    // Accept this one
    await client.query(
      `UPDATE job_applications SET status = 'accepted' WHERE id = $1`,
      [applicationId]
    );

    // Assign freelancer + transition: funded → assigned
    await client.query(
      `UPDATE jobs SET status = 'assigned', freelancer_id = $1 WHERE id = $2`,
      [application.freelancer_id, application.job_id]
    );

    // Update escrow with freelancer
    await client.query(
      `UPDATE escrows SET freelancer_id = $1 WHERE job_id = $2`,
      [application.freelancer_id, application.job_id]
    );

    await client.query("COMMIT");

    res.json({ message: "Application accepted, freelancer assigned" });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to accept application" });
  } finally {
    client.release();
  }
};

// ----------------------------
// Submit Work (Freelancer only)
// assigned → submitted
// ----------------------------
export const completeJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can submit work" });
    }

    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.freelancer_id !== userId) {
      return res.status(403).json({ message: "You are not assigned to this job" });
    }

    if (job.status !== "assigned") {
      return res.status(400).json({
        message: `Job cannot be submitted in status: ${job.status}`
      });
    }

    await pool.query(
      `UPDATE jobs SET status = 'submitted' WHERE id = $1`,
      [jobId]
    );

    res.json({ message: "Work submitted successfully. Awaiting client approval." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to submit work" });
  }
};

// ----------------------------
// Approve Work (Client only)
// submitted → released
// ----------------------------
export const approveJob = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const userId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "client") {
      return res.status(403).json({ message: "Only clients can approve work" });
    }

    const { jobId } = req.body;

    if (!jobId) {
      return res.status(400).json({ message: "jobId is required" });
    }

    await client.query("BEGIN");

    const jobResult = await client.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.client_id !== userId) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "You do not own this job" });
    }

    if (job.status !== "submitted") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: `Job cannot be approved in status: ${job.status}`
      });
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

    const walletResult = await client.query(
      `SELECT * FROM wallets WHERE user_id = $1`,
      [job.freelancer_id]
    );

    const wallet = walletResult.rows[0];
    if (!wallet) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Freelancer wallet not found" });
    }

    // Credit freelancer
    await client.query(
      `UPDATE wallets SET balance = balance + $1 WHERE id = $2`,
      [escrow.amount, wallet.id]
    );

    // Release escrow
    await client.query(
      `UPDATE escrows SET status = 'released' WHERE id = $1`,
      [escrow.id]
    );

    // Transition: submitted → released
    await client.query(
      `UPDATE jobs SET status = 'released' WHERE id = $1`,
      [jobId]
    );

    // Log transaction
    await client.query(
      `INSERT INTO transactions (wallet_id, type, amount)
       VALUES ($1, $2, $3)`,
      [wallet.id, "escrow_release", escrow.amount]
    );

    await client.query("COMMIT");

    res.json({ message: "Work approved. Escrow released to freelancer." });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to approve job" });
  } finally {
    client.release();
  }
};

// ----------------------------
// Raise Dispute
// submitted → disputed
// ----------------------------
export const disputeJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const userId = (req as any).user.userId;

    const { jobId, reason } = req.body;

    if (!jobId || !reason) {
      return res.status(400).json({ message: "jobId and reason are required" });
    }

    const jobResult = await pool.query(
      `SELECT * FROM jobs WHERE id = $1`,
      [jobId]
    );

    const job = jobResult.rows[0];
    if (!job) {
      return res.status(404).json({ message: "Job not found" });
    }

    if (job.client_id !== userId && job.freelancer_id !== userId) {
      return res.status(403).json({ message: "You are not a party to this job" });
    }

    if (job.status !== "submitted") {
      return res.status(400).json({
        message: `Job cannot be disputed in status: ${job.status}`
      });
    }

    await pool.query(
      `UPDATE jobs SET status = 'disputed' WHERE id = $1`,
      [jobId]
    );

    res.json({ message: "Dispute raised. An admin will review shortly." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to raise dispute" });
  }
};

// ----------------------------
// Get My Work (Freelancer only)
// ----------------------------
export const getMyWork = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const freelancerId = (req as any).user.userId;
    const role = (req as any).user.role;

    if (role !== "freelancer") {
      return res.status(403).json({ message: "Only freelancers can access this" });
    }

    const result = await pool.query(
      `SELECT j.*,
              u.name AS client_name
       FROM jobs j
       LEFT JOIN users u ON u.id = j.client_id
       WHERE j.freelancer_id = $1
       ORDER BY j.created_at DESC`,
      [freelancerId]
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch assigned jobs" });
  }
};