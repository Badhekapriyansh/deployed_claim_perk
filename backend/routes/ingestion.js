const express = require("express");
const multer = require("multer");
const csvParser = require("csv-parser");
const fs = require("fs");
const { ingestItems } = require("../services/ingestionService");

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // Temporary upload directory

/**
 * @route POST /api/ingestion/csv
 * @desc Ingests product/offer data from a CSV file
 */
router.post("/csv", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const results = [];
  fs.createReadStream(req.file.path)
    .pipe(csvParser())
    .on("data", (data) => results.push(data))
    .on("end", async () => {
      try {
        // Run ingestion flow
        const ingestionResult = await ingestItems(results);
        
        // Clean up temp file
        fs.unlinkSync(req.file.path);

        res.json({
          message: "CSV ingestion complete",
          ...ingestionResult
        });
      } catch (err) {
        res.status(500).json({ error: "Ingestion failed", details: err.message });
      }
    })
    .on("error", (err) => {
      res.status(500).json({ error: "Failed to parse CSV", details: err.message });
    });
});

/**
 * @route POST /api/ingestion/manual
 * @desc Ingests product/offer data from manual entry (JSON body)
 */
router.post("/manual", async (req, res) => {
  try {
    let items = req.body;
    
    // Support both single object and array
    if (!Array.isArray(items)) {
      items = [items];
    }

    if (items.length === 0) {
      return res.status(400).json({ error: "No items provided for ingestion" });
    }

    const ingestionResult = await ingestItems(items);

    res.json({
      message: "Manual ingestion complete",
      ...ingestionResult
    });
  } catch (err) {
    res.status(500).json({ error: "Ingestion failed", details: err.message });
  }
});

module.exports = router;
