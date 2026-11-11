const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const app = express();

// Security headers
app.use(helmet());

// Parse JSON request bodies
app.use(express.json());

// Allow frontend requests during development
app.use(
  cors({
    origin: "http://localhost:5173",
  })
);

// Welcome endpoint
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Welcome to BalanceVault API",
  });
});

// Health endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    status: "healthy",
    service: "BalanceVault Backend",
  });
});

module.exports = app;