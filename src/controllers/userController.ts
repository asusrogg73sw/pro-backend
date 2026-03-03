import { NextFunction, Request, Response } from 'express';
import User, { IUser } from '../models/userModel';
import asyncHandler from '../middlewares/asyncHandler';
import generateToken from '../utils/generateToken';

// =======================
// Custom request type for authenticated routes
// =======================
export interface AuthRequest extends Request {
  user?: IUser;
}

// =======================
// 📌 Register User
// =======================
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, age, isAdmin } = req.body;

  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  const user = await User.create({ name, email, password, age, isAdmin });

  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    isAdmin: user.isAdmin,
  });
});

// =======================
// 📌 Authenticate User / Login
// =======================
export const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      isAdmin: user.isAdmin,
      token: generateToken(user._id.toString()),
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
});

// =======================
// 📌 Get All Users (Admin Only)
// =======================
export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  const users = await User.find({}).select('-password');
  const safeUsers = users.map(u => ({
    _id: u._id,
    name: u.name,
    email: u.email,
    age: u.age,
    isAdmin: u.isAdmin,
  }));
  res.json(safeUsers);
});

// =======================
// 📌 Get User Profile
// =======================
export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  const user = await User.findById(req.user._id).select('-password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    isAdmin: user.isAdmin,
  });
});

// =======================
// 📌 Update User Profile
// =======================
export const updateUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  user.age = req.body.age ?? user.age;

  if (req.body.password) {
    user.password = req.body.password; // hashed via pre-save hook
  }

  const updatedUser = await user.save();

  res.json({
    _id: updatedUser._id,
    name: updatedUser.name,
    email: updatedUser.email,
    age: updatedUser.age,
    isAdmin: updatedUser.isAdmin,
  });
});

// =======================
// 📌 Delete User (Admin Only)
// =======================
export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();
  res.json({ message: 'User removed successfully' });
});

// =======================
// 📌 Update User by Admin
// =======================
export const updateUserByAdmin = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  user.age = req.body.age ?? user.age;

  if (req.body.isAdmin !== undefined) {
    user.isAdmin = req.body.isAdmin;
  }

  const updatedUser = await user.save();

  res.json({
    message: 'User updated successfully',
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      isAdmin: updatedUser.isAdmin,
    },
  });
});