import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import process from "node:process";
import { connectDB } from "./db/connectdb.js";
import dotenv from "dotenv";
import authRoutes from "./routes/auth.route.js";
import questionsRoutes from "./routes/questions.route.js";
import testRoutes from "./routes/test.route.js";
import { initializeScheduler } from "./services/scheduler.js";

dotenv.config();
const app = express();
const port = process.env.PORT || 4545;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/tests", testRoutes);

const startServer = async () => {
  try {
    await connectDB();
    initializeScheduler();

    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
