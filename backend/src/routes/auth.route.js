import express from "express";
import { login, logout, signup, checkAuth } from "../controllers/auth.controller.js";
import { updateUserSettings, getUserSettings } from "../controllers/settings.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.get("/check-auth", verifyToken, checkAuth);

router.get("/settings", verifyToken, getUserSettings);
router.post("/settings", verifyToken, updateUserSettings);

export default router;
