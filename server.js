import cors from "cors";
import express from "express";
import fetch from "node-fetch";
import process from "node:process";

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

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
  console.log(`Server running at http://localhost:${port}`);
});
