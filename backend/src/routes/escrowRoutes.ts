import express from "express";
import { fundJob } from "../controllers/escrowController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/fund", authenticateToken, fundJob);

// POST /escrow/release intentionally disabled.
// All escrow releases go through POST /jobs/approve
// which handles the full transaction atomically.

export default router;