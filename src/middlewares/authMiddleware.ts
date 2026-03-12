import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from './asyncHandler';
import User from '../models/userModel';

interface AuthRequest extends Request {
  user?: any;
}

export const protect = asyncHandler(
  async (req: AuthRequest, res: Response, next: NextFunction) => {

    const token = req.cookies?.token; // 👈 cookie se token

    if (!token) {
      res.status(401);
      throw new Error('Not authorized, no token');
    }

    try {

      if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET not defined");
      }

      const decoded: any = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }

      req.user = user;

      next();

    } catch (error) {
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
});

export const admin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized as an admin');
  }
};