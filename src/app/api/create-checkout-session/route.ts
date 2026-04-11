import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-02-25.clover",
  });
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  try {
    const body = await request.json();
    const {
      amount,
      customerEmail,
      locale,
      discountCode,
      metadata,
      lineItems,
      shipmentCost,
    } = body;

    // Validate required fields
    if (!amount || !customerEmail || !locale) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Build frontend URL with proper scheme
    const frontendUrl =
      process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000";
    const baseUrl = frontendUrl.startsWith("http")
      ? frontendUrl
      : `http://${frontendUrl}`;

    // Build line items for Stripe checkout
    const stripeLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    // Detect whether the backend has already baked a discount into `amount`.
    // If the raw sum of line items + shipping differs from `amount`, the backend
    // applied a discount (percentage / fixed / free-shipping) and we must use
    // `amount` directly so Stripe charges the correct discounted total.
    let discountAlreadyApplied = false;

    if (lineItems && Array.isArray(lineItems) && lineItems.length > 0) {
      const rawItemsTotal = (
        lineItems as { unitPrice: number; quantity: number }[]
      ).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const undiscountedTotal = rawItemsTotal + (shipmentCost || 0);
      discountAlreadyApplied = Math.abs(undiscountedTotal - amount) > 0.01;

      if (!discountAlreadyApplied) {
        // No discount applied – send individual line items so Stripe shows a breakdown
        lineItems.forEach(
          (item: { name: string; quantity: number; unitPrice: number }) => {
            stripeLineItems.push({
              price_data: {
                currency: "chf",
                product_data: {
                  name: item.name,
                },
                unit_amount: Math.round(item.unitPrice * 100),
              },
              quantity: item.quantity,
            });
          },
        );

        // Add shipping as a separate line item if it exists
        if (shipmentCost && shipmentCost > 0) {
          stripeLineItems.push({
            price_data: {
              currency: "chf",
              product_data: {
                name: "Shipping",
              },
              unit_amount: Math.round(shipmentCost * 100),
            },
            quantity: 1,
          });
        }
      } else {
        // Discount already included in `amount` – use it as a single line item
        // to guarantee Stripe charges exactly what the backend calculated.
        stripeLineItems.push({
          price_data: {
            currency: "chf",
            product_data: {
              name: "Revsticks Order",
              description: "Your trusted supermoto shop from Switzerland",
            },
            unit_amount: Math.round(amount * 100),
          },
          quantity: 1,
        });
      }
    } else {
      // Fallback to single line item if no items provided (backward compatibility)
      stripeLineItems.push({
        price_data: {
          currency: "chf",
          product_data: {
            name: "Revsticks Order",
            description: "Your trusted supermoto shop from Switzerland",
          },
          unit_amount: Math.round(amount * 100), // Convert to cents
        },
        quantity: 1,
      });
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card", "twint", "paypal", "klarna"],
      line_items: stripeLineItems,
      mode: "payment",
      success_url: `${baseUrl}/${locale}/payment-check?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/${locale}/checkout`,
      customer_email: customerEmail,
      metadata: metadata || {},
    };

    // Add locale if it's a valid Stripe locale
    const validLocales = ["de", "en", "fr", "it"];
    if (validLocales.includes(locale)) {
      sessionParams.locale =
        locale as Stripe.Checkout.SessionCreateParams.Locale;
    }

    // Apply discount code via Stripe promotion codes only when the discount has
    // NOT already been applied by the backend (i.e. `amount` is still undiscounted).
    if (discountCode && !discountAlreadyApplied) {
      try {
        // Look up the coupon/promotion code
        const promotionCodes = await stripe.promotionCodes.list({
          code: discountCode,
          active: true,
          limit: 1,
        });

        if (promotionCodes.data.length > 0) {
          sessionParams.discounts = [
            {
              promotion_code: promotionCodes.data[0].id,
            },
          ];
        }
      } catch (error) {
        console.error("Error applying discount code:", error);
        // Continue without discount if it fails
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 },
    );
  }
}
