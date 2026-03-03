import { NextFunction, Request, Response } from 'express';
import User, { IUser } from '../models/userModel';
import asyncHandler from '../middlewares/asyncHandler';
import generateToken from '../utils/generateToken';

// Custom Request type
export interface AuthRequest extends Request {
  user?: IUser;
}

// =======================
// Register User (First user becomes admin)
// =======================
export const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password, age } = req.body;

  // 1️⃣ Check if user with same email exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // 2️⃣ Check if this is the first user in the DB
  const usersCount = await User.countDocuments({});
  const isFirstUserAdmin = usersCount === 0; // agar DB empty, first user admin hoga

  // 3️⃣ Create user
  const user = await User.create({
    name,
    email,
    password,
    age,
    isAdmin: isFirstUserAdmin, // pehla user admin, baaki false
  });

  // 4️⃣ Response
  res.status(201).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    isAdmin: user.isAdmin,
  });
});

// =======================
// Login User
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
// Get Own Profile
// =======================
export const getUserProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    res.status(401);
    throw new Error('Not authenticated');
  }

  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    age: req.user.age,
    isAdmin: req.user.isAdmin,
  });
});

// =======================
// Update Own Profile
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

  // 🔥 ADD THIS BLOCK HERE
if (req.body.email && req.body.email !== user.email) {
  const emailExists = await User.findOne({ email: req.body.email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already in use");
  }
}

  user.name = req.body.name ?? user.name;
  user.email = req.body.email ?? user.email;
  user.age = req.body.age ?? user.age;

  if (req.body.password) {
    user.password = req.body.password; // hashed via pre-save hook
  }

  // 🚫 Never allow normal user to change isAdmin
  // user.isAdmin = req.body.isAdmin ?? user.isAdmin; // REMOVE

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
// Admin: Get All Users
// =======================
export const getUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) {
    res.status(403);
    throw new Error('Access denied, admin only');
  }

  const users = await User.find({}).select('-password');
  res.json(users);
});

// =======================
// Admin: Delete User
// =======================
export const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) {
    res.status(403);
    throw new Error('Access denied, admin only');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();
  res.json({ message: 'User removed successfully' });
});

// =======================
// Admin: Update User (can change isAdmin)
// =======================
export const updateUserByAdmin = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.user?.isAdmin) {
    res.status(403);
    throw new Error('Access denied, admin only');
  }

  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (req.body.email && req.body.email !== user.email) {
  const emailExists = await User.findOne({ email: req.body.email });
  if (emailExists) {
    res.status(400);
    throw new Error("Email already in use");
  }
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