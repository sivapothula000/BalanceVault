import express from "express";
import {
  createAccount,
  listAccounts,
} from "../controllers/account.controller.js";
import {
  authenticateToken,
  requireRole,
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticateToken,
  requireRole("CUSTOMER"),
  createAccount
);
router.get("/", authenticateToken, listAccounts);

export default router;
