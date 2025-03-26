import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { Form } from "../models/form.data.js";

const router = express.Router();
dotenv.config();

const GOOGLE_SCRIPT_URL_SCHEDULER =
  "https://script.google.com/macros/s/AKfycbzRxT6g0_TIy71tfsSemISsv4n6PUcBUeMuQQ3j8ajXJR5A-BB4PR6g5SdFrcRQfZTjNA/exec";
const GOOGLE_SCRIPT_URL_FORMS =
  "https://script.google.com/macros/s/AKfycbxPBZuYLB9VY-knbQEEa9DTRkG_RSpK6p-W2PCHKcmZ4B_l5U7WrZarWIdM2mi_l9Fm/exec";
const GOOGLE_SCRIPT_URL_FORM_EXTRACTOR =
  "https://script.google.com/macros/s/AKfycbwI3_RnnEXUpIqYCi1w6IwR9VHkJr7ngyvZoARCwjGh1UNl062FYaYnQv6xLKNmjGx0EA/exec";

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

    const response = await fetch(scriptUrl, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const responseText = await response.text();

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
        error: "Missing required folderId parameter",
      });
    }

    // Use the same Google Script URL but with a get request
    const scriptUrl = `${GOOGLE_SCRIPT_URL_FORMS}?folderId=${folderId}`;

    const response = await fetch(scriptUrl);
    const responseText = await response.text();

    try {
      // Try to parse as JSON
      const jsonData = JSON.parse(responseText);
      return res.json(jsonData);
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Google Script",
        data: responseText,
      });
    }
  } catch (error) {
    console.error("Error fetching forms:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Simplified route to use form extractor script with caching
router.get("/forms-extract", async (req, res) => {
  try {
    const { folderId, refresh } = req.query;

    if (!folderId) {
      return res.status(400).json({
        success: false,
        error: "Missing required folderId parameter",
      });
    }

    // check cache first if not forcing refresh
    if (refresh !== "true") {
      const cachedData = await Form.findOne({ folderId }).lean();

      // if we have cached data, use it
      if (cachedData && cachedData.forms) {
        return res.json({
          success: true,
          forms: cachedData.forms,
          fromCache: true,
        });
      }
    }

    // cache miss or refresh requested, fetch from google script
    const scriptUrl = `${GOOGLE_SCRIPT_URL_FORM_EXTRACTOR}?folderId=${folderId}`;
    const response = await fetch(scriptUrl);
    const responseText = await response.text();

    try {
      const jsonData = JSON.parse(responseText);

      // update cache
      await Form.findOneAndUpdate(
        { folderId },
        {
          forms: jsonData.forms,
          lastFetched: new Date(),
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        },
      );

      return res.json({
        success: true,
        forms: jsonData.forms,
        fromCache: false,
      });
    } catch (e) {
      return res.status(500).json({
        success: false,
        error: "Invalid response from Form Extractor Script",
        data: responseText,
      });
    }
  } catch (error) {
    console.error("Error extracting forms:", error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
