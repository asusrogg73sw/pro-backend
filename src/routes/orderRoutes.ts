import { Router } from 'express';
import { 
  addOrderItems, 
  getMyOrders, 
  getOrderById, 
  updateOrderToPaid, 
  getOrders, 
  updateOrderToDelivered 
} from '../controllers/orderController';
import { protect, admin } from '../middlewares/authMiddleware'; // added admin middleware
import validate from '../middlewares/validateMiddleware';
import { createOrderSchema } from '../validations/orderValidation';

const router = Router();

// POST /api/orders → create new order
router.route('/').post(protect, validate(createOrderSchema), addOrderItems);

// GET /api/orders → Admin: get all orders
router.route('/').get(protect, admin, getOrders);

// GET /api/orders/myorders → User: get own orders
router.route('/myorders').get(protect, getMyOrders);

// GET /api/orders/:id → Specific order
router.route('/:id').get(protect, getOrderById);

// PUT /api/orders/:id/pay → Update payment
router.route('/:id/pay').put(protect, updateOrderToPaid);

// PUT /api/orders/:id/deliver → Admin: update delivered status
router.route('/:id/deliver').put(protect, admin, updateOrderToDelivered);

export default router;