import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { customers } from "./db/schema";

export function generatePasswordResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generatePasswordResetExpiry(): Date {
  const expiry = new Date();
  expiry.setHours(expiry.getHours() + 1); // 1 hour
  return expiry;
}

export async function createPasswordResetToken(
  email: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "User not found" };
    }

    const token = generatePasswordResetToken();
    const expires = generatePasswordResetExpiry();

    await db
      .update(customers)
      .set({
        password_reset_token: token,
        password_reset_expires: expires,
      })
      .where(eq(customers.email, email));

    return { success: true, token };
  } catch (error) {
    console.error("Password reset token creation error:", error);
    return { success: false, error: "Failed to create reset token" };
  }
}

export async function verifyPasswordResetToken(
  token: string
): Promise<{ success: boolean; email?: string; error?: string }> {
  try {
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.password_reset_token, token))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "Invalid reset token" };
    }

    const userData = user[0];

    if (!userData.password_reset_expires) {
      return { success: false, error: "No reset expiry found" };
    }

    if (new Date() > userData.password_reset_expires) {
      return { success: false, error: "Reset token has expired" };
    }

    return { success: true, email: userData.email };
  } catch (error) {
    console.error("Password reset verification error:", error);
    return { success: false, error: "Verification failed" };
  }
}

export async function resetPassword(
  token: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db
      .select()
      .from(customers)
      .where(eq(customers.password_reset_token, token))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "Invalid reset token" };
    }

    const userData = user[0];

    if (!userData.password_reset_expires) {
      return { success: false, error: "No reset expiry found" };
    }

    if (new Date() > userData.password_reset_expires) {
      return { success: false, error: "Reset token has expired" };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset token
    await db
      .update(customers)
      .set({
        password: hashedPassword,
        password_reset_token: null,
        password_reset_expires: null,
      })
      .where(eq(customers.id, userData.id));

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return { success: false, error: "Password reset failed" };
  }
}
