import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import asyncHandler from './asyncHandler';
import User from '../models/userModel';

// Request interface ko extend karein taake hum req.user use kar sakein
interface AuthRequest extends Request {
    user?: any;
}

export const protect = asyncHandler(async (req: AuthRequest, res: Response, next: NextFunction) => {
    let token;

    // 1. Check karein ke header mein 'Authorization' aur 'Bearer' hai ya nahi
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // 2. Token ko alag karein (Bearer <token>)
            token = req.headers.authorization.split(' ')[1];

            // 3. Token verify karein
            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret123');

            // 4. Database se user nikaalein (lekin password ke baghair) aur request mein save kar dein
            req.user = await User.findById(decoded.id).select('-password');

            next(); // Agle function (controller) ki taraf jao
        } catch (error) {
            res.status(401);
            throw new Error('Not authorized, token failed');
        }
    }

    if (!token) {
        res.status(401);
        throw new Error('Not authorized, no token');
    }
});

export const admin = (req: any, res: Response, next: NextFunction) => {
    if (req.user && req.user.isAdmin) {
        next();
    } else {
        res.status(401);
        throw new Error('Not authorized as an admin');
    }
};