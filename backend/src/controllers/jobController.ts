import { Request, Response } from "express";
import { poolPromise } from "../db";

export const createJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const clientId = (req as any).user.userId;
    const { title, description, budget } = req.body;

    if (!title || !budget) {
      return res.status(400).json({ message: "Title and budget required" });
    }

    const result = await pool.query(
      `INSERT INTO jobs (client_id, title, description, budget)
       VALUES ($1, $2, $3, $4)
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

export const getJobs = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const result = await pool.query(
      `SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC`
    );

    res.json(result.rows);

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to fetch jobs" });
  }
};

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

export const applyToJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;

    const freelancerId = (req as any).user.userId;
    const { jobId, proposal } = req.body;

    const result = await pool.query(
      `INSERT INTO job_applications (job_id, freelancer_id, proposal)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [jobId, freelancerId, proposal]
    );

    res.status(201).json({
      message: "Application submitted",
      application: result.rows[0]
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to apply to job" });
  }
};

export const acceptApplication = async (req: Request, res: Response) => {
  const pool = await poolPromise;
  const client = await pool.connect();

  try {
    const { applicationId } = req.body;

    await client.query("BEGIN");

    const applicationResult = await client.query(
      `SELECT * FROM job_applications WHERE id = $1`,
      [applicationId]
    );

    const application = applicationResult.rows[0];

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Mark application accepted
    await client.query(
      `UPDATE job_applications
       SET status = 'accepted'
       WHERE id = $1`,
      [applicationId]
    );
  
  // Assign freelancer to job and update status
await client.query(
  `UPDATE jobs
   SET status = 'assigned',
       freelancer_id = $1
   WHERE id = $2`,
  [application.freelancer_id, application.job_id]
);

    await client.query("COMMIT");

    res.json({
      message: "Freelancer assigned to job"
    });

  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    res.status(500).json({ message: "Failed to accept application" });
  } finally {
    client.release();
  }
};

export const completeJob = async (req: Request, res: Response) => {
  try {
    const pool = await poolPromise;
    const { jobId } = req.body;

    await pool.query(
      `UPDATE jobs
       SET status = 'completed'
       WHERE id = $1`,
      [jobId]
    );

    res.json({
      message: "Job marked as completed"
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to complete job" });
  }
};