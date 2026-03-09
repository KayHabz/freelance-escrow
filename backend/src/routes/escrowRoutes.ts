import express from "express";
import { fundJob, releaseEscrow } from "../controllers/escrowController";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/fund", authenticateToken, fundJob);
router.post("/release", authenticateToken, releaseEscrow);

export default router;