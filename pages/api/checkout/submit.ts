import { db, pool } from "@/lib/db";
import {
  addresses,
  carts,
  inventory,
  orderItems,
  prices,
  productOptionValues,
  products,
} from "@/lib/db/schema";
import {
  sendAdminOrderNotification,
  sendOrderConfirmationEmail,
} from "@/lib/email";
import { trackProductPurchase } from "@/lib/product-analytics";
import { sendSuccessResponse } from "@/lib/security/error-handling";
import { withCheckoutRequest } from "@/lib/security/request-wrapper";
import { eq, inArray, sql } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { v4 as uuidv4 } from "uuid";

/**
 * Checkout submission endpoint
 * Creates an order from cart items - supports both authenticated and guest users
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user?: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    cartItems,
    shippingAddress,
    billingAddress,
    useSameAddress,
    orderNotes,
    guestEmail,
  } = req.body;

  // Determine if this is a guest checkout
  // If guestEmail is provided, treat as guest checkout regardless of auth status
  const isGuestCheckout = !!guestEmail;

  if (!user && !isGuestCheckout) {
    return res.status(401).json({
      success: false,
      error: "Authentication required or guest email must be provided",
    });
  }

  // Validate guest email if provided
  if (
    isGuestCheckout &&
    (!guestEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
  ) {
    return res.status(400).json({
      success: false,
      error: "Valid email address is required for guest checkout",
    });
  }

  // Validate cart items and calculate pricing server-side (optimized with batch queries)
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

  try {
    // Extract unique product IDs for batch query
    const productIds: string[] = [
      ...new Set(
        (cartItems as { product_id: string }[]).map((item) => item.product_id)
      ),
    ];

    // Batch fetch all products with prices
    const productsData = await db
      .select({
        id: products.id,
        title: products.title,
        base_price: products.base_price,
        price: prices.amount,
        currency: prices.currency,
      })
      .from(products)
      .innerJoin(prices, eq(prices.product_id, products.id))
      .where(inArray(products.id, productIds));

    // Create a map for quick lookup
    const productsMap = new Map(productsData.map((p) => [p.id, p]));

    // Collect all option values for batch query
    const allOptionValues: Array<{
      productId: string;
      optionName: string;
      optionValue: string;
    }> = [];
    cartItems.forEach(
      (cartItem: { product_id: string; selected_options?: any }) => {
        if (
          cartItem.selected_options &&
          Object.keys(cartItem.selected_options).length > 0
        ) {
          Object.entries(cartItem.selected_options).forEach(
            ([optionName, optionValue]) => {
              allOptionValues.push({
                productId: cartItem.product_id,
                optionName,
                optionValue: optionValue as string,
              });
            }
          );
        }
      }
    );

    // Batch fetch option values if any exist
    let optionValuesMap = new Map<string, any>();
    if (allOptionValues.length > 0) {
      const optionValueNames = [
        ...new Set(allOptionValues.map((ov) => ov.optionValue)),
      ];
      const optionValuesData = await db
        .select({
          price_adjustment: productOptionValues.price_adjustment,
          name: productOptionValues.name,
          product_id: products.id,
        })
        .from(productOptionValues)
        .innerJoin(products, eq(productOptionValues.option_id, products.id))
        .where(inArray(productOptionValues.name, optionValueNames));

      optionValuesMap = new Map(
        optionValuesData.map((ov) => [`${ov.product_id}-${ov.name}`, ov])
      );
    }

    // First, validate inventory availability for all items
    const inventoryData = await db
      .select({
        product_id: products.id,
        quantity_available: inventory.quantity_available,
      })
      .from(products)
      .innerJoin(inventory, eq(inventory.product_id, products.id))
      .where(inArray(products.id, productIds));

    const inventoryMap = new Map(
      inventoryData.map((inv) => [inv.product_id, inv.quantity_available])
    );

    // Check inventory for all items before processing
    const outOfStockItems: Array<{
      product_title: string;
      requested: number;
      available: number;
    }> = [];
    for (const cartItem of cartItems) {
      const available = inventoryMap.get(cartItem.product_id) || 0;
      if (available < cartItem.quantity) {
        const product = productsMap.get(cartItem.product_id);
        outOfStockItems.push({
          product_title: product?.title || "Unknown Product",
          requested: cartItem.quantity,
          available: available,
        });
      }
    }

    // If any items are out of stock, return error with details
    if (outOfStockItems.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Some items are no longer in stock",
        outOfStockItems: outOfStockItems,
      });
    }

    // Process each cart item
    for (const cartItem of cartItems) {
      const product = productsMap.get(cartItem.product_id);

      if (!product) {
        return res.status(400).json({
          success: false,
          error: `Product ${cartItem.product_id} not found`,
        });
      }

      // Start with base product price
      let finalPrice = parseFloat(product.price);

      // Add price adjustments for selected options
      if (
        cartItem.selected_options &&
        Object.keys(cartItem.selected_options).length > 0
      ) {
        Object.entries(cartItem.selected_options).forEach(
          ([optionName, optionValueName]) => {
            const optionKey = `${cartItem.product_id}-${optionValueName}`;
            const optionValue = optionValuesMap.get(optionKey);
            if (optionValue) {
              finalPrice += parseFloat(optionValue.price_adjustment);
            }
          }
        );
      }

      // Generate descriptive title
      let descriptiveTitle = product.title;
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
        product_title: product.title,
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

    // Generate order number (same format for both guest and logged-in users)
    const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${Math.random()
      .toString(36)
      .substr(2, 4)
      .toUpperCase()}`;

    // Create order and process inventory atomically
    await db.transaction(async (tx) => {
      // Create order using raw SQL to avoid Drizzle schema issues
      const orderId = uuidv4();

      // Use raw postgres client to bypass Drizzle parameter ordering bug
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO orders (
              id, customer_id, guest_email, order_number, is_guest_order,
              status, currency, subtotal, tax, shipping, total
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            orderId,
            isGuestCheckout ? null : user.id,
            isGuestCheckout ? guestEmail : null,
            orderNumber,
            isGuestCheckout,
            "received",
            "USD",
            subtotal.toString(),
            tax.toString(),
            shipping.toString(),
            total.toString(),
          ]
        );
      } finally {
        client.release();
      }

      const newOrder = { id: orderId };
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

        // Track product purchase analytics (async, non-blocking)
        const totalPrice = item.unit_amount * item.quantity;
        trackProductPurchase({
          productId: item.product_id,
          orderId: newOrder.id,
          customerId: isGuestCheckout ? null : user.id,
          quantity: item.quantity,
          unitPrice: item.unit_amount,
          totalPrice: totalPrice,
        }).catch((err) => {
          console.error("Failed to track product purchase:", err);
          // Don't fail the order if analytics tracking fails
        });
      }

      // Check inventory availability and deduct atomically
      for (const item of validatedItems) {
        const result = await tx.execute(sql`
        UPDATE inventory 
        SET quantity_available = quantity_available - ${item.quantity},
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

      // Save shipping address
      await tx.insert(addresses).values({
        id: uuidv4(),
        customer_id: isGuestCheckout ? null : user.id,
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
          customer_id: isGuestCheckout ? null : user.id,
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

      // Clear user's cart if it exists (only for authenticated users)
      if (!isGuestCheckout) {
        const existingCart = await tx
          .select()
          .from(carts)
          .where(eq(carts.customer_id, user.id))
          .limit(1);

        if (existingCart.length > 0) {
          await tx
            .delete(cartItems)
            .where(eq(cartItems.cart_id, existingCart[0].id));
          await tx.delete(carts).where(eq(carts.id, existingCart[0].id));
        }
      }
    });

    // Send confirmation emails asynchronously (non-blocking)
    if (createdOrderId) {
      const customerEmail = isGuestCheckout ? guestEmail : user.email;
      const customerName = isGuestCheckout ? shippingAddress.name : user.name;

      const emailData = {
        orderId: createdOrderId,
        orderNumber: orderNumber,
        customerEmail,
        customerName,
        orderItems: validatedItems,
        shippingAddress,
        subtotal,
        tax,
        shipping,
        total,
        isGuestOrder: isGuestCheckout,
      };

      // Send emails asynchronously without blocking the response
      Promise.all([
        sendOrderConfirmationEmail(emailData),
        sendAdminOrderNotification(emailData),
      ]).catch((emailError) => {
        console.error("Email sending failed:", emailError);
        // Log error but don't fail the order
      });
    }

    // Return success response
    sendSuccessResponse(
      res,
      {
        orderId: createdOrderId!,
        orderNumber: orderNumber,
        total: total.toString(),
        status: "received",
        isGuestOrder: isGuestCheckout,
      },
      isGuestCheckout
        ? "Guest order created successfully"
        : "Order created successfully",
      201
    );
  } catch (error) {
    console.error("Checkout error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    return res.status(500).json({
      success: false,
      error: "Order submission failed",
    });
  }
}

export default withCheckoutRequest(handler, "checkout_submit");
