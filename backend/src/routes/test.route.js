import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  createTest,
  getAllTests,
  getTestById,
  updateTest,
  deleteTest,
  uploadPdf,
  previewPdf,   // Add these two
} from "../controllers/test.controller.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Test CRUD operations
router.post("/", createTest);
router.get("/", getAllTests);
router.get("/:id", getTestById);
router.put("/:id", updateTest);
router.delete("/:id", deleteTest);

// PDF upload - will be enhanced with multer middleware
router.post("/:id/upload-pdf", upload.single("pdf"), uploadPdf);

// Add the missing routes
router.post("/preview", upload.single("pdf"), previewPdf);

export default router;