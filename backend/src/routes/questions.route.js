import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

// Get the URLs for different GAS scripts
const GOOGLE_SCRIPT_URL_SCHEDULER = process.env.GOOGLE_SCRIPT_URL_SCHEDULER;
const GOOGLE_SCRIPT_URL_FORMS = process.env.GOOGLE_SCRIPT_URL_FORMS;

router.post("/", async (req, res) => {
  try {
    const { action, data } = req.body;
    
    // Determine which script URL to use based on the action
    let scriptUrl;
    
    // Actions for the P1toGoogleForms script
    if (action === "convertPDFsToForms") {
      scriptUrl = GOOGLE_SCRIPT_URL_FORMS;
      // Validate inputs
      if (!data.sourceFolderId || !data.markschemeFolderId || !data.targetFolderId) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields for PDF conversion"
        });
      }
    } 
    // Actions for the Scheduler script
    else if (["postQuestions", "postEmails", "setStartingNumber"].includes(action)) {
      scriptUrl = GOOGLE_SCRIPT_URL_SCHEDULER;
      
      // Validate specific action inputs
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
        if (!data.grade || !data.number) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields for setting starting number: grade or number"
          });
        }
      }
    } 
    else {
      return res.status(400).json({
        success: false,
        error: "Unknown action type"
      });
    }
    
    // Make sure we have a valid script URL
    if (!scriptUrl) {
      return res.status(500).json({
        success: false,
        error: "No script URL configured for this action"
      });
    }
    
    // Proceed with sending the request to the appropriate Google Script
    const formData = new URLSearchParams();
    formData.append("payload", JSON.stringify(req.body));

    console.log(`Sending request to ${action} script...`);
    const response = await fetch(scriptUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseText = await response.text();
    console.log("Raw response from Google Script:", responseText);

    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseText);
      return res.json(jsonData);
    } catch (e) {
      console.error("Error parsing Google Script response as JSON:", e);
      
      // Return a properly structured error response
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
