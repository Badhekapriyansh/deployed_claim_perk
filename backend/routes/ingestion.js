const express = require("express");
const router = express.Router();
const { ingestItems } = require("../services/ingestionService");

/**
 * Parses raw CSV text into array of object records.
 */
function parseCSVText(csvText) {
  if (!csvText || typeof csvText !== "string") return [];
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const parseLine = (line) => {
    const result = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "")
  );
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;
    const rowObj = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = values[index] !== undefined ? values[index] : "";
      }
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * @route POST /api/ingestion/csv
 * @desc Ingests product/offer data from CSV text or CSV upload
 */
router.post("/csv", express.text({ type: ["text/csv", "text/plain", "application/csv"], limit: "10mb" }), async (req, res) => {
  try {
    let csvData = "";
    if (typeof req.body === "string" && req.body.trim()) {
      csvData = req.body;
    } else if (req.body && typeof req.body.csvText === "string") {
      csvData = req.body.csvText;
    } else if (req.body && Array.isArray(req.body.items)) {
      const result = await ingestItems(req.body.items);
      return res.json({ message: "CSV ingestion complete", ...result });
    }

    if (!csvData) {
      return res.status(400).json({ error: "No CSV content provided" });
    }

    const items = parseCSVText(csvData);
    if (items.length === 0) {
      return res.status(400).json({ error: "Could not parse any valid rows from CSV" });
    }

    const result = await ingestItems(items);
    res.json({ message: "CSV ingestion complete", ...result });
  } catch (err) {
    res.status(500).json({ error: "CSV Ingestion failed", details: err.message });
  }
});

/**
 * @route POST /api/ingestion/manual
 * @desc Ingests product/offer data from manual JSON payload
 */
router.post("/manual", async (req, res) => {
  try {
    let items = req.body;

    if (items && typeof items === "object" && !Array.isArray(items) && items.items && Array.isArray(items.items)) {
      items = items.items;
    } else if (!Array.isArray(items)) {
      items = [items];
    }

    if (!items || items.length === 0 || !items[0]) {
      return res.status(400).json({ error: "No items provided for manual ingestion" });
    }

    const result = await ingestItems(items);
    res.json({ message: "Manual ingestion complete", ...result });
  } catch (err) {
    res.status(500).json({ error: "Manual Ingestion failed", details: err.message });
  }
});

module.exports = router;
