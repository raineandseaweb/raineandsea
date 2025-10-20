import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { customers } from "./db/schema";
import { getSecretAsync } from "./encryption/async-secrets";

// Lazy initialization of JWT secret
let jwtSecret: string | null = null;

async function getJWTSecret(): Promise<string> {
  if (!jwtSecret) {
    jwtSecret = await getSecretAsync("JWT_SECRET");
  }
  return jwtSecret;
}

// JWT secret will be loaded asynchronously when needed

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Find user by email (explicit columns to avoid non-existent fields)
    const user = await db
      .select({
        id: customers.id,
        email: customers.email,
        name: customers.name,
        password: customers.password,
        role: customers.role,
        email_verified: customers.email_verified,
      })
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (user.length === 0) {
      return { success: false, error: "Invalid email or password" };
    }

    // Check password
    const isValid = await bcrypt.compare(password, user[0].password || "");

    if (!isValid) {
      return { success: false, error: "Invalid email or password" };
    }

    // Check if email is verified
    if (!user[0].email_verified) {
      return {
        success: false,
        error:
          "Please verify your email address before logging in. Check your inbox for a verification link.",
      };
    }

    // Generate JWT token
    const secret = await getJWTSecret();
    if (!secret) {
      return { success: false, error: "JWT secret not configured" };
    }

    const token = jwt.sign(
      {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name,
        role: user[0].role,
      },
      secret,
      { expiresIn: "7d" }
    );

    return {
      success: true,
      user: {
        id: user[0].id,
        email: user[0].email,
        name: user[0].name || undefined,
        role: user[0].role,
      },
      token,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return { success: false, error: "Authentication failed" };
  }
}

export function verifyToken(token: string): User | null {
  try {
    const secret = jwtSecret || "";
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function verifyTokenAsync(token: string): Promise<User | null> {
  try {
    const secret = await getJWTSecret();
    if (!secret) return null;
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      name?: string;
      role?: string;
    };
    return {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
    };
  } catch {
    return null;
  }
}

export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Check if user already exists
    const existingUser = await db
      .select()
      .from(customers)
      .where(eq(customers.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      return { success: false, error: "User with this email already exists" };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // Create user
    const newUser = await db
      .insert(customers)
      .values({
        name,
        email,
        password: hashedPassword,
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires,
      })
      .returning();

    // Return success without JWT token - user needs to verify email first
    return {
      success: true,
      user: {
        id: newUser[0].id,
        email: newUser[0].email,
        name: newUser[0].name || undefined,
      },
      // No token - user must verify email first
    };
  } catch (error) {
    console.error("User creation error:", error);
    return { success: false, error: "User creation failed" };
  }
}
