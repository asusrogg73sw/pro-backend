import { Request, Response } from "express";
import Stripe from "stripe";
import asyncHandler from "../middlewares/asyncHandler";
import Order from "../models/orderModel";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-01-28.clover",
});

// =====================================
// 1️⃣ Create Payment Intent
// =====================================

export const processPayment = asyncHandler(
  async (req: Request, res: Response) => {
    const { orderId } = req.body;

    const order = await Order.findById(orderId);

    if (!order) {
      res.status(404);
      throw new Error("Order not found");
    }

    if (order.isPaid) {
      res.status(400);
      throw new Error("Order already paid");
    }

    // amount frontend se nahi lena (security)
    const amount = Math.round(order.totalPrice * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        orderId: order._id.toString(),
      },
    });

    res.status(200).json({
      success: true,
      client_secret: paymentIntent.client_secret,
    });
  },
);

// =====================================
// Helper Function
// =====================================

const updateOrderToPaidInDB = async (orderId: string, paymentIntent: any) => {
  const order = await Order.findById(orderId);

  if (!order) {
    console.log("❌ Order not found");
    return;
  }

  // duplicate webhook protection
  if (order.isPaid) {
    console.log("⚠️ Order already marked as paid");
    return;
  }

  order.isPaid = true;
  order.paidAt = new Date();

  order.paymentResult = {
    id: paymentIntent.id,
    status: paymentIntent.status,
    update_time: String(Date.now()),
    email_address: paymentIntent.receipt_email || "",
  };

  await order.save();

  console.log(`✅ Order ${orderId} marked as PAID`);
};

// =====================================
// 2️⃣ Stripe Webhook
// =====================================

export const handleStripeWebhook = async (req: any, res: Response) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    console.error(`❌ Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    // ===============================
    // Payment Success
    // ===============================

    case "payment_intent.succeeded": {
      const paymentIntent = event.data.object as any;

      const orderId = paymentIntent.metadata?.orderId;

      if (!orderId) {
        console.log("❌ orderId missing in metadata");
        break;
      }

      await updateOrderToPaidInDB(orderId, paymentIntent);

      break;
    }

    // ===============================
    // Payment Failed
    // ===============================

    case "payment_intent.payment_failed": {
      const failedIntent = event.data.object as any;

      console.log(
        `❌ Payment Failed for Order: ${failedIntent.metadata?.orderId}`,
      );

      break;
    }

    // ===============================
    // Refund
    // ===============================

    case "charge.refunded": {
      const charge = event.data.object as any;

      const orderId = charge.metadata?.orderId;

      if (!orderId) {
        console.log("❌ orderId missing in refund metadata");
        break;
      }

      const order = await Order.findById(orderId);

      if (!order) {
        console.log("❌ Order not found during refund");
        break;
      }

      order.isPaid = false;

      await order.save();

      console.log(`💰 Order ${orderId} refunded`);

      break;
    }

    default:
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};


// this code is working fine