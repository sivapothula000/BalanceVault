
import express from "express";
import cors from "cors";
import helmet from "helmet";
import prisma from "./config/database.js";

const app = express();

app.use(helmet());
app.use(cors({
  origin: "http://localhost:5173",
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to BalanceVault API",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    message: "BalanceVault API is running",
  });
});
app.get("/api/db-health", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.json({
      status: "healthy",
      database: "connected",
      message: "PostgreSQL connection successful",
    });
  } catch (error) {
    console.error("Database connection failed:", error);

    res.status(500).json({
      status: "unhealthy",
      database: "disconnected",
    });
  }
});

export default app;
