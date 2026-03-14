import { Response } from "express";
import jwt from "jsonwebtoken";

const generateToken = (res: Response, userId: string) => {
  // 2 hours expiry
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: "2h",
  });

  // Cookie set karna
  res.cookie("jwt", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 2 * 60 * 60 * 1000,
  });
};

export default generateToken;
