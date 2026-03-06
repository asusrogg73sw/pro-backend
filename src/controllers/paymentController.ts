// paymentController.ts

import { Request, Response } from 'express';
import Stripe from 'stripe';
import asyncHandler from '../middlewares/asyncHandler';
import Order from '../models/orderModel';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2022-11-15' });

// 1️⃣ Old Code: PaymentIntent Create
export const processPayment = asyncHandler(async (req: Request, res: Response) => {
  const { amount, orderId } = req.body;

  if (!amount || amount <= 0) {
    res.status(400);
    throw new Error('Invalid payment amount');
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    metadata: { orderId }, // order identify karne ke liye
  });

  res.status(200).json({
    success: true,
    client_secret: paymentIntent.client_secret,
  });
});

// 2️⃣ New Code: Webhook Handle
export const handleStripeWebhook = async (req: any, res: Response) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;

    const order = await Order.findById(orderId);

    if (order) {
      order.isPaid = true;
      order.paidAt = new Date();
      order.paymentResult = {
        id: paymentIntent.id,
        status: paymentIntent.status,
        update_time: String(Date.now()),
        email_address: paymentIntent.receipt_email || '',
      };
      await order.save();
      console.log(`✅ Order ${orderId} marked as PAID via Webhook!`);
    }
  }

  res.json({ received: true });
};