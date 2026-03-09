import express from "express";
import {
  createJob,
  getJobs,
  getJobById,
  applyToJob,
  acceptApplication,
  completeJob
} from "../controllers/jobController";

import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/", authenticateToken, createJob);

router.get("/", getJobs);

router.get("/:id", getJobById);

router.post("/apply", authenticateToken, applyToJob);

router.post("/accept", authenticateToken, acceptApplication);

router.post("/complete", authenticateToken, completeJob);

export default router;