import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User, { IUser } from '../models/User';

/**
 * Extend Express Request to include user
 */
export interface AuthRequest extends Request {
  user?: IUser;
  userId?: string;
}

/**
 * JWT Payload Interface
 */
interface JWTPayload {
  userId: string;
  email: string;
}

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Please provide a valid token.',
      });
      return;
    }

    // Extract token
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token is missing.',
      });
      return;
    }

    // Verify token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;

    // Find user by ID
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found. Token may be invalid.',
      });
      return;
    }

    // Attach user to request
    req.user = user;
    req.userId = user._id.toString();

    next();
  } catch (error: any) {
    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        success: false,
        message: 'Invalid token. Please log in again.',
      });
      return;
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({
        success: false,
        message: 'Token has expired. Please log in again.',
      });
      return;
    }

    // Generic error
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
    });
  }
};

/**
 * Optional Authentication Middleware
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret || !token) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload;
    const user = await User.findById(decoded.userId).select('-password');

    if (user) {
      req.user = user;
      req.userId = user._id.toString();
    }

    next();
  } catch (error) {
    // Silently continue if optional auth fails
    next();
  }
};

export default authenticate;