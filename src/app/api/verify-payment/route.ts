import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentIntentId = searchParams.get("payment_intent");

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "payment_intent is required" },
        { status: 400 }
      );
    }

    // Retrieve the payment intent from Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    console.log("Payment intent retrieved:", {
      id: paymentIntent.id,
      status: paymentIntent.status,
      receipt_email: paymentIntent.receipt_email,
      customer_email: paymentIntent.metadata?.customer_email,
    });

    return NextResponse.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      receipt_email: paymentIntent.receipt_email,
      customer_email: paymentIntent.metadata?.customer_email,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error("Error verifying payment intent:", error);

    return NextResponse.json(
      {
        error: "Failed to verify payment intent",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
