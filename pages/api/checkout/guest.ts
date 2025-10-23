import { db } from "@/lib/db";
import {
  addresses,
  orderItems,
  orders,
  prices,
  productOptionValues,
  products,
} from "@/lib/db/schema";
import {
  sendAdminOrderNotification,
  sendOrderConfirmationEmail,
} from "@/lib/email";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withRateLimit } from "@/lib/security/rate-limiting";
import { withCheckoutRequest } from "@/lib/security/request-wrapper";
import { eq, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

/**
 * Guest checkout submission endpoint
 * Creates an order without requiring user authentication
 */
async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Rate limiting for guest checkout
    withRateLimit(req, "CHECKOUT");

    const {
      cartItems,
      shippingAddress,
      billingAddress,
      useSameAddress,
      orderNotes,
      guestEmail,
    } = req.body;

    // Validate required fields
    if (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail)) {
      return sendErrorResponse(
        res,
        "Valid email address is required for guest checkout",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (!cartItems || !Array.isArray(cartItems) || cartItems.length === 0) {
      return sendErrorResponse(
        res,
        "Cart items are required",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (!shippingAddress) {
      return sendErrorResponse(
        res,
        "Shipping address is required",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // Validate cart items and calculate pricing server-side
    const validatedItems: Array<{
      product_id: string;
      product_title: string;
      quantity: number;
      unit_amount: number;
      selected_options: any;
      descriptive_title: string;
    }> = [];
    let subtotal = 0;
    let createdOrderId: string | null = null;

    console.log("Processing guest checkout with", cartItems.length, "items");

    for (const cartItem of cartItems) {
      // Get product with current price
      const product = await db
        .select({
          id: products.id,
          title: products.title,
          base_price: products.base_price,
          price: prices.amount,
          currency: prices.currency,
        })
        .from(products)
        .innerJoin(prices, eq(prices.product_id, products.id))
        .where(eq(products.id, cartItem.product_id))
        .limit(1);

      if (!product.length) {
        return sendErrorResponse(
          res,
          `Product ${cartItem.product_id} not found`,
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // Start with base product price
      let finalPrice = parseFloat(product[0].price);

      // Add price adjustments for selected options
      if (
        cartItem.selected_options &&
        Object.keys(cartItem.selected_options).length > 0
      ) {
        for (const [optionName, optionValueName] of Object.entries(
          cartItem.selected_options
        )) {
          const optionValue = await db
            .select({
              price_adjustment: productOptionValues.price_adjustment,
              name: productOptionValues.name,
            })
            .from(productOptionValues)
            .innerJoin(products, eq(productOptionValues.option_id, products.id))
            .where(
              sql`${productOptionValues.name} = ${optionValueName} AND ${products.id} = ${cartItem.product_id}`
            )
            .limit(1);

          if (optionValue.length > 0) {
            finalPrice += parseFloat(optionValue[0].price_adjustment);
          }
        }
      }

      // Generate descriptive title
      let descriptiveTitle = product[0].title;
      if (
        cartItem.selected_options &&
        Object.keys(cartItem.selected_options).length > 0
      ) {
        const optionTexts = Object.entries(cartItem.selected_options)
          .map(([optionName, optionValue]) => `${optionName}: ${optionValue}`)
          .join(", ");
        descriptiveTitle += ` (${optionTexts})`;
      }

      // Store server-calculated price with product details
      validatedItems.push({
        product_id: cartItem.product_id,
        product_title: product[0].title,
        quantity: cartItem.quantity,
        unit_amount: finalPrice,
        selected_options: cartItem.selected_options,
        descriptive_title: descriptiveTitle,
      });

      subtotal += finalPrice * cartItem.quantity;
    }

    // Calculate totals
    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 100 ? 0 : 9.99; // Free shipping over $100
    const total = subtotal + tax + shipping;

    // Generate order number
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // Create order and process inventory atomically
    await db.transaction(async (tx) => {
      // Create guest order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          id: uuidv4(),
          customer_id: null, // No customer for guest orders
          guest_email: guestEmail,
          order_number: orderNumber,
          is_guest_order: true,
          status: "received",
          currency: "USD",
          subtotal: subtotal.toString(),
          tax: tax.toString(),
          shipping: shipping.toString(),
          total: total.toString(),
        })
        .returning();
      createdOrderId = newOrder.id;

      // Create order items with server-calculated prices
      for (const item of validatedItems) {
        await tx.insert(orderItems).values({
          id: uuidv4(),
          order_id: newOrder.id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_amount: item.unit_amount.toString(),
          selected_options: item.selected_options,
          descriptive_title: item.descriptive_title,
        });
      }

      // Deduct inventory atomically
      for (const item of validatedItems) {
        const result = await tx.execute(sql`
        UPDATE inventory 
        SET quantity_available = quantity_available - ${item.quantity},
            quantity_reserved = quantity_reserved + ${item.quantity},
            updated_at = NOW()
        WHERE product_id = ${item.product_id} 
        AND quantity_available >= ${item.quantity}
        RETURNING quantity_available
      `);

        if (result.rows.length === 0) {
          throw new Error(
            `Insufficient inventory for product ${item.product_id}`
          );
        }
      }

      // Save shipping address (no customer_id for guest orders)
      await tx.insert(addresses).values({
        id: uuidv4(),
        customer_id: null, // No customer for guest orders
        order_id: newOrder.id,
        type: "shipping",
        name: shippingAddress.name,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        region: shippingAddress.region,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        is_default: false,
      });

      // Save billing address if different
      if (!useSameAddress && billingAddress) {
        await tx.insert(addresses).values({
          id: uuidv4(),
          customer_id: null, // No customer for guest orders
          order_id: newOrder.id,
          type: "billing",
          name: billingAddress.name,
          line1: billingAddress.line1,
          line2: billingAddress.line2,
          city: billingAddress.city,
          region: billingAddress.region,
          postal_code: billingAddress.postal_code,
          country: billingAddress.country,
          is_default: false,
        });
      }
    });

    // Send confirmation emails after transaction
    try {
      if (createdOrderId) {
        await sendOrderConfirmationEmail({
          orderId: createdOrderId,
          customerEmail: guestEmail,
          customerName: shippingAddress.name,
          orderItems: validatedItems,
          shippingAddress,
          subtotal,
          tax,
          shipping,
          total,
          isGuestOrder: true,
        });

        await sendAdminOrderNotification({
          orderId: createdOrderId,
          customerEmail: guestEmail,
          customerName: shippingAddress.name,
          orderItems: validatedItems,
          shippingAddress,
          subtotal,
          tax,
          shipping,
          total,
          isGuestOrder: true,
        });
      }
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail the order if emails fail
    }

    // Return success response
    sendSuccessResponse(
      res,
      {
        orderId: createdOrderId!,
        orderNumber: orderNumber,
        total: total.toString(),
        status: "received",
        isGuestOrder: true,
      },
      "Guest order created successfully",
      201
    );
  } catch (error) {
    console.error("Guest checkout error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return sendErrorResponse(
      res,
      "Guest order submission failed",
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
}

export default withCheckoutRequest(handler, "checkout_guest");
