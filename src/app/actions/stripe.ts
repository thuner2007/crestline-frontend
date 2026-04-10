"use server";

import { stripe } from "../../lib/stripe";

interface CreatePaymentIntentRequest {
  amount: number;
  currency?: string;
  email?: string;
  name?: string;
}

export async function createPaymentIntent(data: CreatePaymentIntentRequest) {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(data.amount * 100), // Convert to cents
      currency: data.currency || "chf",
      description: "RevSticks Order",
      receipt_email: data.email || undefined, // Always set receipt email
      metadata: {
        customer_name: data.name || "Guest",
        customer_email: data.email || "unknown", // Store email in metadata as backup
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    };
  } catch (error) {
    console.error("Stripe error:", error);
    throw error;
  }
}
