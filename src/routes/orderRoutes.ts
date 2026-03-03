import { Router } from 'express';
import { addOrderItems, getMyOrders, getOrderById, updateOrderToPaid } from '../controllers/orderController';
import { protect } from '../middlewares/authMiddleware';
import validate from '../middlewares/validateMiddleware';
import { createOrderSchema } from '../validations/orderValidation';

const router = Router();

// POST /api/orders
router.route('/').post(protect, validate(createOrderSchema), addOrderItems);

// User ke apne orders (Isay upar rakhein)
router.route('/myorders').get(protect, getMyOrders);

// Specific order details
router.route('/:id').get(protect, getOrderById);

// Order payment update
router.route('/:id/pay').put(protect, updateOrderToPaid);

export default router;