import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import fetch from "node-fetch";
import process from "node:process";
import { connectDB } from "./db/connectdb.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzXesTY1XEb9Z40-3A7m-c42RpWgeYgypvbV4JrprLrKJjQgKHow_w4U3TNVtY6MyTPdA/exec";

app.post("/api/questions", async (req, res) => {
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

app.listen(port, () => {
  connectDB();
  console.log(`Server running at http://localhost:${port}`);
});
