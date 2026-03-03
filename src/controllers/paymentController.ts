import { Request, Response } from 'express';
import Stripe from 'stripe';
import asyncHandler from '../middlewares/asyncHandler';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

// @desc    Create Stripe Payment Intent
// @route   POST /api/payment/process
// @access  Private
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount } = req.body; // Amount paise (cents) mein honi chahiye

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount, // e.g., $10 = 1000 cents
    currency: 'usd',
    metadata: { company: 'MyStore' },
  });

  res.status(200).json({
    success: true,
    client_secret: paymentIntent.client_secret,
  });
});