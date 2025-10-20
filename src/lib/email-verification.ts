import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { customers } from "./db/schema";

export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateVerificationExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 24); // 24 hours
  return expiry;
}

export async function createVerificationToken(email: string): Promise<string> {
  const token = generateVerificationToken();
  const expires = generateVerificationExpiry();

  await db
    .update(customers)
    .set({
      email_verification_token: token,
      email_verification_expires: expires,
    })
    .where(eq(customers.email, email));

  return token;
}

export async function verifyEmailToken(
  token: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email_verification_token, token))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "Invalid verification token" };
    }

    const userData = user[0];

    if (!userData.email_verification_expires) {
      return { success: false, error: "No verification expiry found" };
    }

    if (new Date() > userData.email_verification_expires) {
      return { success: false, error: "Verification token has expired" };
    }

    if (userData.email_verified) {
      return { success: false, error: "Email already verified" };
    }

    // Mark email as verified and clear token
    await db
      .update(customers)
      .set({
        email_verified: new Date(),
        email_verification_token: null,
        email_verification_expires: null,
      })
      .where(eq(customers.id, userData.id));

    return { success: true, email: userData.email };
  } catch (error) {
    console.error("Email verification error:", error);
    return { success: false, error: "Verification failed" };
  }
}

export async function resendVerificationToken(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    if (user[0].email_verified) {
      return { success: false, error: "Email already verified" };
    }

    await createVerificationToken(email);
    return { success: true };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { success: false, error: "Failed to resend verification" };
  }
}
