// ============================================================
// routes/extract.js — OCR-Free Gemini Invoice Extraction
// Sends raw file buffer to Gemini multimodal API as inlineData.
// Uses Structured JSON Output to enforce a rigid schema contract.
// Includes Exponential Backoff to gracefully handle 429 Rate Limits.
// ============================================================

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { GoogleGenAI } = require("@google/genai");
const pool = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const router = express.Router();

// ── Multer: store uploads in memory (no temp disk write needed for Gemini) ──
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB limit
  fileFilter: (req, file, cb) => {
    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPEG, PNG, WebP, and PDF files are supported."));
    }
  },
});

// ── Gemini Client Initialization ──────────────────────────────────────────────
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ── Structured Output Schema for Gemini Response ─────────────────────────────
const INVOICE_SCHEMA = {
  type: "object",
  properties: {
    invoice_no: {
      type: "string",
      description: "Invoice number or reference ID",
    },
    invoice_date: {
      type: "string",
      description: "Invoice date in YYYY-MM-DD format",
    },
    gstin_no: {
      type: "string",
      description: "15-character GST Identification Number",
    },
    vendor_name: {
      type: "string",
      description: "Name of the vendor or supplier",
    },
    gst_rate: {
      type: "number",
      description: "GST rate as percentage (e.g. 18.00)",
    },
    taxable_amount: {
      type: "number",
      description: "Pre-tax monetary amount in INR",
    },
  },
  required: [
    "invoice_no",
    "invoice_date",
    "gstin_no",
    "vendor_name",
    "gst_rate",
    "taxable_amount",
  ],
};

// ── Prompt for Gemini ─────────────────────────────────────────────────────────
const EXTRACTION_PROMPT = `
You are an expert GST invoice data extraction assistant.
Analyze the attached invoice document (image or PDF) and extract the following fields with maximum accuracy.

Fields to extract:
- invoice_no: The invoice number, bill number, or reference number
- invoice_date: The invoice date formatted strictly as YYYY-MM-DD
- gstin_no: The 15-digit alphanumeric GST Identification Number of the supplier/vendor
- vendor_name: The full legal name of the vendor, supplier, or seller
- gst_rate: The GST percentage rate applied (e.g. 5, 12, 18, 28 — as a decimal like 18.00)
- taxable_amount: The taxable value BEFORE tax is added (not the total amount)

Rules:
- If a field is not found, return an empty string for text fields or 0 for numeric fields
- For invoice_date, always convert to YYYY-MM-DD format regardless of how it appears
- For gstin_no, extract exactly 15 characters (format: 2 digits + 10 alphanumeric + 1 alpha + 1 alpha + 1 digit)
- For gst_rate, extract the rate as a plain number like 18, not "18%"
- Return ONLY the JSON object — no explanations, no markdown
`;

// ── Helper Function for Exponential Backoff ──────────────────────────────────
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function generateContentWithRetry(model, options, maxRetries = 3) {
  let attemptDelay = 2000; // Start with a 2-second fallback wait time

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(options);
    } catch (error) {
      const isRateLimit =
        error.status === 429 ||
        (error.message && error.message.includes("429"));

      if (isRateLimit && attempt < maxRetries) {
        // Look for explicit wait directives from Gemini's error object, else calculate exponential step
        let waitTimeMs = attemptDelay * Math.pow(2, attempt);

        if (error.message && error.message.includes("retry in")) {
          const match = error.message.match(/retry in ([\d.]+)s/);
          if (match && match[1]) {
            // Buffer the suggested wait time by 2 extra seconds to ensure the block clears
            waitTimeMs = (parseFloat(match[1]) + 2) * 1000;
          }
        }

        console.warn(
          `[Gemini API] 429 Rate Limit hit on attempt ${attempt}/${maxRetries}. Retrying in ${(waitTimeMs / 1000).toFixed(2)}s...`,
        );
        await delay(waitTimeMs);
      } else {
        // Throw the error if max retries hit or if it's a completely different issue (e.g., 400, 401)
        throw error;
      }
    }
  }
}

/**
 * POST /api/extract
 * Receives a single file upload, sends it to Gemini as raw base64 inlineData,
 * extracts GST invoice fields, saves to DB, and returns the structured result.
 */
router.post(
  "/",
  authenticateToken,
  upload.single("invoice"),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const { buffer, mimetype, originalname } = req.file;

    try {
      // ── Step 1: Encode file buffer as base64 for Gemini inlineData ───────────
      const base64Data = buffer.toString("base64");

      // ── Step 2: Configure request payload ────────────────────────────────────
      
      const requestOptions = {
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType: mimetype,
                  data: base64Data,
                },
              },
              { text: EXTRACTION_PROMPT },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: INVOICE_SCHEMA,
          temperature: 0.1,
        },
      };
  

      // ── Step 3: Call Gemini with retry ───────────────────────────
      console.log("Calling Gemini...");

      const response = await generateContentWithRetry(
        ai.models,
        requestOptions,
        3,
      );

      console.log("Gemini responded successfully");

      // ── Step 4: Parse Gemini JSON response ───────────────────────
      let extracted;

      try {
        // New SDK response
        let rawText =
          response?.candidates?.[0]?.content?.parts?.[0]?.text ||
          response?.text ||
          "";

        console.log("RAW GEMINI RESPONSE:");
        console.log(rawText);

        // Remove markdown wrappers if Gemini adds them
        rawText = rawText
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

        extracted = JSON.parse(rawText);

        console.log("PARSED JSON:");
        console.log(extracted);
      } catch (parseErr) {
        console.error("JSON parse error:", parseErr);

        return res.status(422).json({
          error: "Gemini returned invalid JSON.",
          details: parseErr.message,
        });
      }
      // ── Step 5: Save extracted data + original file to disk ──────────────────
      const uploadDir = process.env.UPLOAD_DIR || "./uploads";
      if (!fs.existsSync(uploadDir))
        fs.mkdirSync(uploadDir, { recursive: true });

      const filename = `${Date.now()}_${originalname.replace(/\s+/g, "_")}`;
      const filePath = path.join(uploadDir, filename);
      fs.writeFileSync(filePath, buffer);

      // ── Step 6: Persist to PostgreSQL ────────────────────────────────────────
      const invoiceDate = extracted.invoice_date
        ? new Date(extracted.invoice_date).toISOString().split("T")[0]
        : null;

      const dbResult = await pool.query(
        `INSERT INTO invoices
         (user_id, invoice_no, invoice_date, gstin_no, vendor_name,
          gst_rate, taxable_amount, raw_extracted_json, file_path, original_filename)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
        [
          req.user.id,
          extracted.invoice_no || null,
          invoiceDate,
          extracted.gstin_no || null,
          extracted.vendor_name || null,
          extracted.gst_rate || 0,
          extracted.taxable_amount || 0,
          JSON.stringify(extracted),
          filePath,
          originalname,
        ],
      );

      const savedInvoice = dbResult.rows[0];

      // ── Step 7: Return extracted data and DB row to frontend ─────────────────
      res.json({
        message: "Invoice extracted and saved successfully.",
        invoice: savedInvoice,
        extracted: extracted,
        file_path: filePath,
      });
    } catch (err) {
      console.error("Extraction error processing failed:", err);

      // Check if the final crash was due to unresolvable rate limiting
      if (err.status === 429 || (err.message && err.message.includes("429"))) {
        return res.status(429).json({
          error:
            "The server is currently experiencing heavy load or API limits have been temporarily exceeded. Please try again in a moment.",
        });
      }

      const message = err.message || "Gemini extraction failed.";
      res.status(500).json({ error: message });
    }
  },
);

module.exports = router;
