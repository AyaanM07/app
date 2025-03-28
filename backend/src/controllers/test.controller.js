import { Test } from "../models/test.data.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFDocument, rgb } from "pdf-lib";

// Get directory name for current module
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "../../uploads");

// Create uploads directory if it doesn't exist
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

// Preview endpoint
export const previewPdf = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No PDF file provided" });
    }

    // Parse selection data
    let selectionData;
    try {
      selectionData = JSON.parse(req.body.selectionData || "{}");
    } catch (e) {
      console.error("Error parsing selection data:", e);
      return res
        .status(400)
        .json({ success: false, message: "Invalid selection data format" });
    }

    // Log some basic info for debugging
    console.log("Processing PDF preview for file:", req.file.originalname);
    console.log(
      "Selected questions count:",
      Object.keys(selectionData.selectedQuestions || {}).filter(
        (k) => selectionData.selectedQuestions[k],
      ).length,
    );

    // Process the PDF - extract only selected questions
    try {
      const processedPdfBytes = await processSelectedQuestions(
        req.file.path,
        selectionData,
      );

      // Check if we have a valid PDF
      if (!processedPdfBytes || processedPdfBytes.length < 100) {
        throw new Error("Failed to generate valid PDF content");
      }

      // Send the processed PDF back to the client
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "inline; filename=preview.pdf");
      res.send(Buffer.from(processedPdfBytes));
    } catch (err) {
      console.error("PDF processing error:", err);
      return res
        .status(500)
        .json({
          success: false,
          message: "Error processing PDF: " + err.message,
        });
    }

    // Clean up temporary file
    try {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting temporary file:", err);
      });
    } catch (err) {
      console.error("Error cleaning up temp file:", err);
    }
  } catch (error) {
    console.error("Error previewing PDF:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update the processSelectedQuestions function to handle pasted content

async function processSelectedQuestions(pdfPath, selectionData) {
  const { customSelections = [], pastedSelections = [] } = selectionData;

  console.log("Processing PDF:", pdfPath);
  console.log("Custom selections count:", customSelections.length);
  console.log("Pasted selections count:", pastedSelections.length);

  // Read the PDF file
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes);

  // Create a new PDF document
  const newPdfDoc = await PDFDocument.create();

  // Track which pages have selections and pastes
  const pageWithSelectionsMap = {};
  const pageWithPastesMap = {};

  // Map custom selections to their pages
  customSelections.forEach((selection) => {
    const pageIndex = selection.pageNumber - 1;
    if (!pageWithSelectionsMap[pageIndex]) {
      pageWithSelectionsMap[pageIndex] = [];
    }
    pageWithSelectionsMap[pageIndex].push(selection);
  });

  // Map pasted content to their pages
  pastedSelections.forEach((paste) => {
    const pageIndex = paste.pageNumber - 1;
    if (!pageWithPastesMap[pageIndex]) {
      pageWithPastesMap[pageIndex] = [];
    }
    pageWithPastesMap[pageIndex].push(paste);
  });

  // Copy all pages from the original document
  for (let pageIndex = 0; pageIndex < pdfDoc.getPageCount(); pageIndex++) {
    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [pageIndex]);

    // If page has custom selections, apply masking
    if (
      pageWithSelectionsMap[pageIndex] &&
      pageWithSelectionsMap[pageIndex].length > 0
    ) {
      const { width, height } = copiedPage.getSize();

      // Process each selection on this page
      pageWithSelectionsMap[pageIndex].forEach((selection) => {
        // Convert normalized coordinates (0-1) to PDF coordinates
        const x = selection.left * width;
        const y = height - selection.top * height - selection.height * height; // Flip Y coordinate
        const selWidth = selection.width * width;
        const selHeight = selection.height * height;

        console.log(
          `Masking area on page ${pageIndex + 1} at (${x}, ${y}) with size ${selWidth}x${selHeight}`,
        );

        // Draw a white rectangle to mask the selected area
        copiedPage.drawRectangle({
          x,
          y,
          width: selWidth,
          height: selHeight,
          color: rgb(1, 1, 1), // White
          opacity: 1,
        });

        // Optionally add a small label
        if (selWidth > 50 && selHeight > 20) {
          copiedPage.drawText("[Masked]", {
            x: x + selWidth / 2 - 20,
            y: y + selHeight / 2,
            size: 10,
            color: rgb(0.7, 0.7, 0.7),
          });
        }
      });
    }

    // If page has pasted content, add the images
    if (
      pageWithPastesMap[pageIndex] &&
      pageWithPastesMap[pageIndex].length > 0
    ) {
      const { width, height } = copiedPage.getSize();

      // Process each paste on this page
      for (const paste of pageWithPastesMap[pageIndex]) {
        try {
          // Convert normalized coordinates (0-1) to PDF coordinates
          const x = paste.left * width;
          const y = height - paste.top * height - paste.height * height; // Flip Y coordinate
          const pasteWidth = paste.width * width;
          const pasteHeight = paste.height * height;

          console.log(
            `Pasting content on page ${pageIndex + 1} at (${x}, ${y}) with size ${pasteWidth}x${pasteHeight}`,
          );

          // Convert the data URL to a buffer
          const base64Data = paste.content.split(",")[1];
          if (!base64Data) {
            console.error("Invalid paste data URL format");
            continue;
          }

          const imageBuffer = Buffer.from(base64Data, "base64");

          // Determine image type and embed it
          let image;
          if (
            paste.content.includes("image/jpeg") ||
            paste.content.includes("image/jpg")
          ) {
            image = await newPdfDoc.embedJpg(imageBuffer);
          } else if (paste.content.includes("image/png")) {
            image = await newPdfDoc.embedPng(imageBuffer);
          } else {
            // Default to PNG if type can't be determined
            image = await newPdfDoc.embedPng(imageBuffer);
          }

          // Draw the image on the page
          copiedPage.drawImage(image, {
            x,
            y,
            width: pasteWidth,
            height: pasteHeight,
          });
        } catch (err) {
          console.error("Error pasting image content:", err);
        }
      }
    }

    newPdfDoc.addPage(copiedPage);
  }

  // Return the modified PDF
  return await newPdfDoc.save();
}

// Update the createTest function to not use subject and duration
export const createTest = async (req, res) => {
  try {
    const { title, description, questions } = req.body;

    const newTest = new Test({
      title,
      description,
      questions,
      creator: req.user._id,
    });

    await newTest.save();

    res.json({ success: true, data: newTest });
  } catch (error) {
    console.error("Error creating test:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllTests = async (req, res) => {
  try {
    const tests = await Test.find({ creator: req.user._id });

    res.status(200).json({
      success: true,
      data: tests,
    });
  } catch (error) {
    console.error("Error getting tests:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTestById = async (req, res) => {
  try {
    const test = await Test.findOne({
      _id: req.params.id,
      creator: req.user._id,
    });

    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      data: test,
    });
  } catch (error) {
    console.error("Error getting test:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateTest = async (req, res) => {
  try {
    const updatedTest = await Test.findOneAndUpdate(
      { _id: req.params.id, creator: req.user._id },
      { ...req.body },
      { new: true },
    );

    if (!updatedTest) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      message: "Test updated successfully",
      data: updatedTest,
    });
  } catch (error) {
    console.error("Error updating test:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteTest = async (req, res) => {
  try {
    const deletedTest = await Test.findOneAndDelete({
      _id: req.params.id,
      creator: req.user._id,
    });

    if (!deletedTest) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    res.status(200).json({
      success: true,
      message: "Test deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting test:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadPdf = async (req, res) => {
  try {
    // This endpoint will be enhanced with multer middleware for file upload handling
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded" });
    }

    const test = await Test.findById(req.params.id);
    if (!test) {
      return res
        .status(404)
        .json({ success: false, message: "Test not found" });
    }

    // Update the test with the PDF URL
    test.pdfUrl = `/uploads/${req.file.filename}`;
    await test.save();

    res.status(200).json({
      success: true,
      message: "PDF uploaded successfully",
      data: {
        pdfUrl: test.pdfUrl,
      },
    });
  } catch (error) {
    console.error("Error uploading PDF:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
