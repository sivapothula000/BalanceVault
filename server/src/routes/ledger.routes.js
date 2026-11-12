import express from "express";
import { listLedgerEntries } from "../controllers/ledger.controller.js";
import { authenticateToken } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", authenticateToken, listLedgerEntries);

export default router;
