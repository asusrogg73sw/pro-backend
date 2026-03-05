import { Request, Response } from 'express';
import Stripe from 'stripe';
import asyncHandler from '../middlewares/asyncHandler';

// Initialize Stripe with secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// @desc    Create Stripe Payment Intent
// @route   POST /api/payment/process
// @access  Private
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body; // Amount should be in cents

  // ✅ Basic validation
  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Invalid payment amount');
  }

  try {
    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,          // e.g., $10 = 1000 cents
      currency: 'usd',
      metadata: {
        // Optional: store user info if you have it
        userId: req.user?.id || 'guest',
      },
    });

    // Send client_secret to frontend
    res.status(200).json({
      success: true,
      client_secret: paymentIntent.client_secret,
    });
  } catch (error: any) {
    console.error('Stripe Error:', error.message);
    res.status(500);
    throw new Error('Payment processing failed');
  }
});