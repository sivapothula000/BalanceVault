import express from "express";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";
import { activateAccount } from "../controllers/account.controller.js";

const router = express.Router();

router.get(
  "/dashboard",
  authenticateToken,
  requireRole("ADMIN"),
  (_req, res) => {
    res.status(200).json({
      success: true,
      message: "Admin access granted",
    });
  }
);
router.patch(
  "/accounts/:id/activate",
  authenticateToken,
  requireRole("ADMIN"),
  activateAccount
);

export default router;
