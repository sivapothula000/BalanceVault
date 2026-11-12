import express from "express";
import { createTransfer } from "../controllers/transfer.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  requireRole("CUSTOMER"),
  createTransfer
);

export default router;
