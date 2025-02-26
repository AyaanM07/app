import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import process from "node:process";
import { connectDB } from "./db/connectdb.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import questionsRoutes from "./routes/questions.route.js";

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
app.use("/api/questions", questionsRoutes);

const startServer = async () => {
  try {
    await connectDB();
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
