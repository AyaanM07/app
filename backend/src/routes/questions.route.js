import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

router.post("/", async (req, res) => {
  try {
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify(req.body));

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = await response.text();

    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (e) {
      res.json({
        success: true,
        message: data,
      });
    }
  } catch (error) {
    console.error("Error in questions API:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
