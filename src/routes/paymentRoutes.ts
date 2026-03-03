import { Router } from 'express';
import { processPayment } from '../controllers/paymentController';
import { protect } from '../middlewares/authMiddleware';

const router = Router();

// POST /api/payment/process
router.route('/process').post(protect, processPayment);

export default router;