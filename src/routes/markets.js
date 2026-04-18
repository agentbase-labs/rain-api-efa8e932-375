"use strict";
const { Router } = require("express");
const { query } = require("../db");

const router = Router();

// GET /markets  — list all markets (optionally filter by workflow_id)
router.get("/", async (req, res) => {
  try {
    const { workflow_id, status, limit = 100, offset = 0 } = req.query;
    let sql = "SELECT * FROM markets WHERE 1=1";
    const params = [];
    if (workflow_id) { sql += ` AND workflow_id = $${params.push(workflow_id)}`; }
    if (status)      { sql += ` AND status = $${params.push(status)}`; }
    sql += ` ORDER BY created_at DESC LIMIT $${params.push(parseInt(limit, 10))} OFFSET $${params.push(parseInt(offset, 10))}`;
    const result = await query(sql, params);
    res.json({ markets: result.rows, total: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /markets/:marketId
router.get("/:marketId", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM markets WHERE market_id = $1 LIMIT 1",
      [req.params.marketId]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Market not found" });
    res.json({ market: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /markets  — create or upsert a market
router.post("/", async (req, res) => {
  try {
    const {
      market_id, workflow_id, question, options = [], tags = [],
      market_type, country, liquidity_usdt = 0, duration_days = 30,
      contract_address, transaction_hash, image_url, description = "", status = "active"
    } = req.body;

    if (!market_id) return res.status(400).json({ error: "market_id is required" });
    if (!question)  return res.status(400).json({ error: "question is required" });

    const result = await query(`
      INSERT INTO markets
        (market_id, workflow_id, question, options, tags, market_type, country,
         liquidity_usdt, duration_days, contract_address, transaction_hash,
         image_url, description, status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      ON CONFLICT (market_id) DO UPDATE SET
        question         = EXCLUDED.question,
        options          = EXCLUDED.options,
        tags             = EXCLUDED.tags,
        market_type      = EXCLUDED.market_type,
        country          = EXCLUDED.country,
        liquidity_usdt   = EXCLUDED.liquidity_usdt,
        image_url        = COALESCE(EXCLUDED.image_url, markets.image_url),
        description      = EXCLUDED.description,
        updated_at       = NOW()
      RETURNING *
    `, [
      market_id, workflow_id, question,
      JSON.stringify(options), JSON.stringify(tags),
      market_type, country, liquidity_usdt, duration_days,
      contract_address, transaction_hash, image_url, description, status
    ]);

    res.status(201).json({ market: result.rows[0], created: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /markets/:marketId/status  — update market status (active/resolved/expired)
router.put("/:marketId/status", async (req, res) => {
  try {
    const { status, winning_option_index } = req.body;
    if (!["active", "resolved", "expired", "pending"].includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }
    const result = await query(`
      UPDATE markets SET status = $1, updated_at = NOW()
      WHERE market_id = $2 RETURNING *
    `, [status, req.params.marketId]);
    if (!result.rows.length) return res.status(404).json({ error: "Market not found" });
    res.json({ market: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
