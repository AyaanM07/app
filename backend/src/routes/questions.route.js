import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";

const router = express.Router();
dotenv.config();

// Get the URLs for different GAS scripts
const GOOGLE_SCRIPT_URL_SCHEDULER = process.env.GOOGLE_SCRIPT_URL_SCHEDULER;
const GOOGLE_SCRIPT_URL_FORMS = process.env.GOOGLE_SCRIPT_URL_FORMS;
// Add this constant at the top with your other constants
const GOOGLE_SCRIPT_URL_FORM_EXTRACTOR = process.env.GOOGLE_SCRIPT_URL_FORM_EXTRACTOR;

router.post("/", async (req, res) => {
  try {
    const { action, data } = req.body;

    // Determine which script URL to use based on the action
    let scriptUrl;

    // Actions for the P1toGoogleForms script
    if (action === "convertPDFsToForms") {
      scriptUrl = GOOGLE_SCRIPT_URL_FORMS;
      // Validate inputs
      if (
        !data.sourceFolderId ||
        !data.markschemeFolderId ||
        !data.targetFolderId
      ) {
        return res.status(400).json({
          success: false,
          error: "Missing required fields for PDF conversion",
        });
      }
    }
    // Actions for the Scheduler script
    else if (
      ["postQuestions", "postEmails", "setStartingNumber"].includes(action)
    ) {
      scriptUrl = GOOGLE_SCRIPT_URL_SCHEDULER;

      // Validate specific action inputs
      if (action === "postQuestions") {
        if (
          !data.folderId ||
          !data.classroomIds ||
          data.classroomIds.length === 0
        ) {
          return res.status(400).json({
            success: false,
            error: "Missing required fields: folderId or classroomIds",
          });
        }
      } else if (action === "postEmails") {
        if (!data.folderIds || !data.sheetId) {
          return res.status(400).json({
            success: false,
            error:
              "Missing required fields for email posting: folderIds or sheetId",
          });
        }
      } else if (action === "setStartingNumber") {
        if (!data.grade || !data.number) {
          return res.status(400).json({
            success: false,
            error:
              "Missing required fields for setting starting number: grade or number",
          });
        }
      }
    } else {
      return res.status(400).json({
        success: false,
        error: "Unknown action type",
      });
    }

    // Make sure we have a valid script URL
    if (!scriptUrl) {
      return res.status(500).json({
        success: false,
        error: "No script URL configured for this action",
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
        message: responseText,
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

// Add a new GET endpoint to fetch forms from a folder
router.get("/forms", async (req, res) => {
  try {
    const { folderId } = req.query;
    
    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required folderId parameter"
      });
    }
    
    // Use the same Google Script URL but with a get request
    const scriptUrl = `${GOOGLE_SCRIPT_URL_FORMS}?folderId=${folderId}`;
    
    console.log(`Fetching forms from folder: ${folderId}`);
    const response = await fetch(scriptUrl);
    
    const responseText = await response.text();
    console.log("Raw response from Google Script:", responseText);
    
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseText);
      return res.json(jsonData);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Google Script",
        data: responseText
      });
    }
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update or add a route to use this new script
router.get("/forms-extract", async (req, res) => {
  try {
    const { folderId } = req.query;
    
    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required folderId parameter"
      });
    }
    
    // Use the new script URL
    const scriptUrl = `${GOOGLE_SCRIPT_URL_FORM_EXTRACTOR}?folderId=${folderId}`;
    
    console.log(`Extracting forms from folder: ${folderId}`);
    const response = await fetch(scriptUrl);
    
    const responseText = await response.text();
    console.log("Raw response from Form Extractor Script:", responseText);
    
    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseText);
      return res.json(jsonData);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Form Extractor Script",
        data: responseText
      });
    }
  } catch (error) {
    console.error("Error extracting forms:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
