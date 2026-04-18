"use strict";
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { runMigrations } = require("./migrate");
const marketsRouter = require("./routes/markets");
const usersRouter = require("./routes/users");

const app = express();
const PORT = process.env.PORT || 10000;

// ── Middleware ──────────────────────────────────────────────────────────────────
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "2mb" }));

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Routes ──────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "Joni Rain API", version: "1.0.0", uptime: process.uptime() });
});

app.use("/markets", marketsRouter);
app.use("/users", usersRouter);

// 404 handler
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ error: err.message || "Internal server error" });
});

// ── Start ───────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await runMigrations();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Joni Rain API running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to start:", err.message);
    process.exit(1);
  }
})();
