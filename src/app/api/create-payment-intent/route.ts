import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../../lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency = "chf", email, name, items } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // Generate description from items if provided
    let description = "RevSticks Order";
    if (items && Array.isArray(items) && items.length > 0) {
      const itemNames = items.map((item: { name: string; quantity: number }) => 
        `${item.quantity}x ${item.name}`
      ).join(", ");
      description = itemNames.length > 200 ? `${itemNames.substring(0, 197)}...` : itemNames;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      description,
      receipt_email: email || undefined,
      metadata: {
        customer_name: name || "Guest",
        customer_email: email || "unknown",
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      id: paymentIntent.id,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Payment intent creation failed" },
      { status: 500 }
    );
  }
}
