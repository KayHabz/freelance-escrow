import { Router } from "express";
import {
  adminLogin,
  getStats,
  getAllJobs,
  getDisputes,
  resolveDispute,
  getAllTransactions,
} from "../controllers/adminController";
import { authenticateAdmin } from "../middlewares/authMiddleware";

const router = Router();

router.post("/login",        adminLogin);
router.get("/stats",         authenticateAdmin, getStats);
router.get("/jobs",          authenticateAdmin, getAllJobs);
router.get("/disputes",      authenticateAdmin, getDisputes);
router.post("/resolve",      authenticateAdmin, resolveDispute);
router.get("/transactions",  authenticateAdmin, getAllTransactions);

export default router;