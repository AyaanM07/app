import jwt from "jsonwebtoken";

export const generateTokenAndSetCookie = (res, userId) => {
  const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  const domain = new URL(process.env.FRONTEND_URL).hostname;

  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict", // allow cross-site cookies in prod
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
    domain
  });

  return token;
};
