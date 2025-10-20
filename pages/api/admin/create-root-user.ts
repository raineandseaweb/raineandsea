import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getSecretAsync } from "@/lib/encryption/async-secrets";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, rootSecret } = req.body;

    // Load ROOT_SECRET from GCP Secret Manager
    const ROOT_SECRET = await getSecretAsync("ROOT_SECRET");

    if (!ROOT_SECRET) {
      console.error("ROOT_SECRET not configured in GCP Secret Manager");
      return res.status(500).json({ error: "Server configuration error" });
    }

    // Verify root secret
    if (rootSecret !== ROOT_SECRET) {
      return res.status(403).json({ error: "Invalid root secret" });
    }

    // Validate required fields
    if (!email) {
      return res.status(400).json({
        error: "Email is required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email format",
      });
    }

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return res.status(409).json({
        error: "User with this email already exists",
      });
    }

    // Hash the ROOT_SECRET as the password
    const hashedPassword = await bcrypt.hash(ROOT_SECRET, 12);

    // Create root user
    const newUser = await db
      .insert(customers)
      .values({
        name: "Root Administrator",
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        role: "root",
        email_verified: new Date(), // Root users are auto-verified
      })
      .returning();

    // Audit log
    console.log(`Root user created: ${email} at ${new Date().toISOString()}`);

    return res.status(201).json({
      message: "Root user created successfully",
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name,
        role: newUser[0].role,
      },
    });
  } catch (error) {
    console.error("Create root user error:", error);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
}
