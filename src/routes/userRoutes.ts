import { Router } from 'express';
import {
  registerUser,
  getUsers,
  authUser,
  getUserProfile,
  updateUserProfile,
  deleteUser,
  updateUserByAdmin
} from '../controllers/userController';

import { admin, protect } from '../middlewares/authMiddleware';
import validate from '../middlewares/validateMiddleware';
import { loginSchema, registerSchema } from '../validations/userValidation';

const router = Router();

// Public
router.post('/', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), authUser);

// User Profile
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Admin Only
router.get('/', protect, admin, getUsers);
router.delete('/:id', protect, admin, deleteUser);
router.put('/:id', protect, admin, updateUserByAdmin); // 👈 Admin update

export default router;