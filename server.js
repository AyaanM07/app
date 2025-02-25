import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import fetch from "node-fetch";
import process from "node:process";
import { connectDB } from "./src/db/connectdb.js";
import dotenv from 'dotenv';
import authRoutes from "./src/auth/routes/auth.route.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 3000;

app.use(cors({ origin: "http://localhost:5173", credentials: true })); // enable CORS for all requests
app.use(express.json()); // for parsing json payloads
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);

const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxRxzGKhI5HPtC-cDWsaPwj7xWS4adNyFM_oXfE6-tkYuxssz-m4P0oYbkA3dyjU1ZS6w/exec";

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
