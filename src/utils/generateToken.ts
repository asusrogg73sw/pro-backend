import { Response } from 'express';
import jwt from 'jsonwebtoken';

const generateToken = (res: Response, userId: string) => {
  // 2 hours expiry
  const token = jwt.sign({ userId }, process.env.JWT_SECRET!, {
    expiresIn: '2h',
  });

  // Cookie set karna
  res.cookie('jwt', token, {
    httpOnly: true, // Frontend JS ise read nahi kar sakti (Security!)
    secure: process.env.NODE_ENV !== 'development', // Sirf HTTPS par kaam karega prod mein
    sameSite: 'strict', // CSRF attacks se bachao
    maxAge: 2 * 60 * 60 * 1000, // 2 hours in ms
  });
};

export default generateToken;