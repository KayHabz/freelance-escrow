import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  getMyJobs,
  getMyWork,
  getJobApplications,
  applyToJob,
  acceptApplication,
  completeJob,
  approveJob,
  disputeJob
} from "../controllers/jobController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

// ── Public ─────────────────────────────────────────────
router.get("/", getJobs);

// ── Static routes (must be before /:id) ───────────────
router.get("/my-jobs", authenticateToken, getMyJobs);
router.get("/my-work", authenticateToken, getMyWork);

// ── Parameterised routes ───────────────────────────────
router.get("/:id", getJobById);
router.get("/:id/applications", authenticateToken, getJobApplications);

// ── Write operations ───────────────────────────────────
router.post("/", authenticateToken, createJob);
router.post("/apply", authenticateToken, applyToJob);
router.post("/accept", authenticateToken, acceptApplication);
router.post("/complete", authenticateToken, completeJob);
router.post("/approve", authenticateToken, approveJob);
router.post("/dispute", authenticateToken, disputeJob);

export default router;