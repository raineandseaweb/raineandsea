import { db } from "@/lib/db";
import { addresses, customers } from "@/lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";

const createAccountSchema = z.object({
  orderNumber: z.string().min(1, "Order number is required"),
  email: z.string().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
  shippingAddress: z
    .object({
      name: z.string(),
      line1: z.string(),
      line2: z.string().optional(),
      city: z.string(),
      region: z.string(),
      postal_code: z.string(),
      country: z.string(),
    })
    .optional(),
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate request body
    const validatedData = createAccountSchema.parse(req.body);
    const { orderNumber, email, password, name, shippingAddress } =
      validatedData;

    // Check if customer already exists
    const existingCustomer = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existingCustomer.length > 0) {
      return res.status(400).json({
        error:
          "An account with this email already exists. Please sign in instead.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create customer account
    const [newCustomer] = await db
      .insert(customers)
      .values({
        email,
        name: name || "",
        password: hashedPassword,
        email_verified: new Date(), // Mark as verified since they just placed an order
      })
      .returning();

    // Save shipping address if provided
    if (shippingAddress) {
      await db.insert(addresses).values({
        customer_id: newCustomer.id,
        type: "shipping",
        name: shippingAddress.name,
        line1: shippingAddress.line1,
        line2: shippingAddress.line2 || "",
        city: shippingAddress.city,
        region: shippingAddress.region,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
        is_default: true, // Set as default since it's their first address
      });
    }

    // TODO: Link the guest order to the new customer account
    // This would require updating the orders table to set customer_id
    // For now, we'll just return success

    return res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        customerId: newCustomer.id,
        email: newCustomer.email,
        name: newCustomer.name,
      },
    });
  } catch (error) {
    console.error("Error creating account from guest order:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "Validation error",
        details: error.issues,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create account",
    });
  }
}
