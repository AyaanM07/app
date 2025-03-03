import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;

router.post("/", async (req, res) => {
  try {
    const { action, data } = req.body;
    
    // Validate request based on action type
    if (action === "postQuestions") {
      if (!data.folderId || (!data.classroomIds || data.classroomIds.length === 0)) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields: folderId or classroomIds"
        });
      }
    } else if (action === "postEmails") {
      if (!data.folderIds || !data.sheetId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields for email posting: folderIds or sheetId"
        });
      }
    } else if (action === "setStartingNumber") {
      // Validate setStartingNumber action
      if (!data.grade || !data.number) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields for setting starting number: grade or number"
        });
      }
      
      // No need for folderId in this action based on your Postman example
    }
    
    // Proceed with sending the request to Google Scripts
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify(req.body));

    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseText = await response.text();
    console.log("Raw response from Google Script:", responseText);

    try {
      // Try to parse as JSON first
      const jsonData = JSON.parse(responseText);
      return res.json(jsonData);
    } catch (e) {
      console.error("Error parsing Google Script response as JSON:", e);
      
      // Check for specific error cases
      if (responseText.includes("data is not defined")) {
        return res.status(400).json({
          success: false,
          error: "Server error: data is not defined in Google Script",
        });
      }
      
      // For any other case, return a properly structured error response
      return res.status(200).json({
        success: false,
        error: "Invalid response from Google Script",
        message: responseText
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
