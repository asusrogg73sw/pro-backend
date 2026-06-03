import { Request, Response } from "express";
import User, { IUser } from "../models/userModel";
import asyncHandler from "../middlewares/asyncHandler";
import generateToken from "../utils/generateToken";

export interface AuthRequest extends Request {
  user?: IUser;
}

// ======================================================
// Register User (FIXED: Added JWT Cookie Generation)
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

    // Count total users to assign admin role to the first user
    const usersCount = await User.countDocuments({});
    const isFirstUserAdmin = usersCount === 0;

    // Create new user with empty shipping schemas
    const user = await User.create({
      name,
      email,
      password,
      age,
      isAdmin: isFirstUserAdmin,
      shippingAddress: {
        country: "Pakistan",
        firstName: "",
        lastName: "",
        address: "",
        city: "",
        postalCode: "",
        phone: "",
      },
    });

    // FIX: Generate JWT token cookie directly upon successful registration
    generateToken(res, user._id.toString());

    // Send complete payload structured response
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      age: user.age,
      isAdmin: user.isAdmin,
      shippingAddress: user.shippingAddress,
    });
  },
);

// ======================================================
// Login User
// ======================================================
export const authUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  generateToken(res, user._id.toString());

  res.status(200).json({
    _id: user._id,
    name: user.name,
    email: user.email,
    age: user.age,
    isAdmin: user.isAdmin,
    shippingAddress: user.shippingAddress,
    message: "Login successful",
  });
});

// ======================================================
// Logout User
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
      shippingAddress: req.user.shippingAddress,
    });
  },
);

// ======================================================
// Update Own Profile
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
      user.password = req.body.password;
    }

    if (req.body.shippingAddress) {
      user.shippingAddress = {
        country: req.body.shippingAddress.country ?? user.shippingAddress?.country,
        firstName: req.body.shippingAddress.firstName ?? user.shippingAddress?.firstName,
        lastName: req.body.shippingAddress.lastName ?? user.shippingAddress?.lastName,
        address: req.body.shippingAddress.address ?? user.shippingAddress?.address,
        city: req.body.shippingAddress.city ?? user.shippingAddress?.city,
        postalCode: req.body.shippingAddress.postalCode ?? user.shippingAddress?.postalCode,
        phone: req.body.shippingAddress.phone ?? user.shippingAddress?.phone,
      };
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      age: updatedUser.age,
      isAdmin: updatedUser.isAdmin,
      shippingAddress: updatedUser.shippingAddress,
    });
  },
);

// ======================================================
// Admin: Get All Users
// ======================================================
export const getUsers = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    const users = await User.find({}).select("-password");
    res.json(users);
  },
);

// ======================================================
// Admin: Delete User
// ======================================================
export const deleteUser = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Admin cannot delete himself");
    }

    if (user.isAdmin) {
      res.status(400);
      throw new Error("Bhai, aap doosre Admin ko delete nahi kar sakte!");
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: "User deleted successfully" });
  },
);

// ======================================================
// Admin: Update User
// ======================================================
export const updateUserByAdmin = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (req.body.email && req.body.email !== user.email) {
      const emailExists = await User.findOne({ email: req.body.email });
      if (emailExists) {
        res.status(400);
        throw new Error("Email already in use");
      }
    }

    if (user._id.toString() === req.user._id.toString() && req.body.isAdmin === false) {
       Greenwood: res.status(400);
      throw new Error("Admin cannot remove his own admin access");
    }

    if (user.isAdmin && req.body.isAdmin === false) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount === 1) {
        res.status(400);
        throw new Error("Cannot remove the last admin from system");
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
      message: "User updated successfully",
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        isAdmin: updatedUser.isAdmin,
        shippingAddress: updatedUser.shippingAddress,
      },
    });
  },
);

// ======================================================
// Admin: Toggle User Admin Role
// ======================================================
export const toggleUserAdmin = asyncHandler(
  async (req: AuthRequest, res: Response) => {
    if (!req.user?.isAdmin) {
      res.status(403);
      throw new Error("Access denied, admin only");
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    if (user._id.toString() === req.user._id.toString()) {
      res.status(400);
      throw new Error("Admin cannot change his own admin role");
    }

    if (user.isAdmin) {
      const adminCount = await User.countDocuments({ isAdmin: true });
      if (adminCount === 1) {
        res.status(400);
        throw new Error("Cannot remove the last admin from system");
      }
    }

    user.isAdmin = !user.isAdmin;
    const updatedUser = await user.save();

    res.json({
      message: `User role updated to ${updatedUser.isAdmin ? "Admin" : "Normal User"}`,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        age: updatedUser.age,
        isAdmin: updatedUser.isAdmin,
        shippingAddress: updatedUser.shippingAddress,
      },
    });
  },
);