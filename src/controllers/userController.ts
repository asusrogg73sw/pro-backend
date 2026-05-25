import { Request, Response } from "express";
import User, { IUser } from "../models/userModel";
import asyncHandler from "../middlewares/asyncHandler";
import generateToken from "../utils/generateToken";

// ======================================================
// Custom Request Type
// req.user middleware se attach hota hai
// ======================================================
export interface AuthRequest extends Request {
  user?: IUser;
}

// ======================================================
// Register User
// First registered user automatically becomes Admin
// ======================================================
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
    const { name, email, password, age } = req.body;

    // Check if email already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error("User already exists");
    }

    // Count total users
    // Agar database empty hai to pehla user admin banega
    const usersCount = await User.countDocuments({});
    const isFirstUserAdmin = usersCount === 0;

    // Create new user
    const user = await User.create({
      name,
      email,
      password,
      age,
      isAdmin: isFirstUserAdmin,
    });

    // Response
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      isAdmin: user.isAdmin,
    });
  },
);

// ======================================================
// Login User
// Authenticate user + generate JWT cookie
// ======================================================
export const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user and include password field
  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Compare entered password with hashed password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  // Generate JWT cookie
  generateToken(res, user._id.toString());

  // Send response
  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    isAdmin: user.isAdmin,
    message: "Login successful",
  });
});

// ======================================================
// Logout User
// Clear JWT cookie
// ======================================================
export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  res.cookie("jwt", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    expires: new Date(0),
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

// ======================================================
// Get Own Profile
// Logged-in user can view own profile
// ======================================================
export const getUserProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      age: req.user.age,
      isAdmin: req.user.isAdmin,
    });
  },
);

// ======================================================
// Update Own Profile
// User can update own profile only
// ======================================================
export const updateUserProfile = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user) {
      res.status(401);
      throw new Error("Not authenticated");
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Check if new email already exists
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({
        email: req.body.email,
      });

      if (emailExists) {
        res.status(400);
        throw new Error("Email already in use");
      }
    }

    // Update fields
    user.name = req.body.name ?? user.name;
    user.email = req.body.email ?? user.email;
    user.age = req.body.age ?? user.age;

    // Update password if provided
    if (req.body.password) {
      user.password = req.body.password;
    }

    // SECURITY:
    // Never allow normal user to update admin role
    // user.isAdmin = req.body.isAdmin;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      isAdmin: updatedUser.isAdmin,
    });
  },
);

// ======================================================
// Admin: Get All Users
// Only admin can access
// ======================================================
export const getUsers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    // Exclude passwords
    const users = await User.find({}).select("-password");

    res.json(users);
  },
);

// ======================================================
// Admin: Delete User
// Admin can delete normal users only
// ======================================================
export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Admin check
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    // Find target user
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // SECURITY:
    // Prevent admin from deleting himself
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Admin cannot delete himself");
    }

    // SECURITY:
    // Prevent deleting another admin
    if (user.isAdmin) {
      res.status(400);
      throw new Error("Bhai, aap doosre Admin ko delete nahi kar sakte!");
    }

    // Delete user
    await User.deleteOne({ _id: user._id });

    res.json({
      message: "User deleted successfully",
    });
  },
);

// ======================================================
// Admin: Update User
// Admin can:
// - update user details
// - make/remove admin
// ======================================================
export const updateUserByAdmin = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Admin check
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    // Find target user
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // Check email uniqueness
    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({
        email: req.body.email,
      });

      if (emailExists) {
        res.status(400);
        throw new Error("Email already in use");
      }
    }

    // ==================================================
    // SECURITY CHECKS
    // ==================================================

    // Prevent admin from removing own admin access
    if (
      user._id.toString() === req.user._id.toString() &&
      req.body.isAdmin === false
    ) {
      res.status(400);
      throw new Error("Admin cannot remove his own admin access");
    }

    // Prevent removing the LAST admin
    if (user.isAdmin && req.body.isAdmin === false) {
      const adminCount = await User.countDocuments({
        isAdmin: true,
      });

      if (adminCount === 1) {
        res.status(400);
        throw new Error("Cannot remove the last admin from system");
      }
    }

    // ==================================================
    // Update fields
    // ==================================================

    user.name = req.body.name ?? user.name;
    user.email = req.body.email ?? user.email;
    user.age = req.body.age ?? user.age;

    // Admin role update
    if (req.body.isAdmin !== undefined) {
      user.isAdmin = req.body.isAdmin;
    }

    // Save updated user
    const updatedUser = await user.save();

    res.json({
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        isAdmin: updatedUser.isAdmin,
      },
    });
  },
);


// ======================================================
// Admin: Toggle User Admin Role
// Admin <-> Normal User
// ======================================================
export const toggleUserAdmin = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    // Only admin allowed
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    // Find target user
    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    // ==================================================
    // SECURITY CHECKS
    // ==================================================

    // Prevent admin from removing own admin access
    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Admin cannot change his own admin role");
    }

    // Prevent removing the LAST admin
    if (user.isAdmin) {
      const adminCount = await User.countDocuments({
        isAdmin: true,
      });

      if (adminCount === 1) {
        res.status(400);
        throw new Error("Cannot remove the last admin from system");
      }
    }

    // ==================================================
    // Toggle Admin Role
    // ==================================================

    user.isAdmin = !user.isAdmin;

    const updatedUser = await user.save();

    res.json({
      message: `User role updated to ${
        updatedUser.isAdmin ? "Admin" : "Normal User"
      }`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        isAdmin: updatedUser.isAdmin,
      },
    });
  },
);