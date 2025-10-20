import crypto from "crypto";
import { getSecretAsync } from "./encryption/async-secrets";

// Lazy initialization of CSRF secret
let CSRF_SECRET: string | null = null;

async function getCSRFSecret(): Promise<string> {
  if (!CSRF_SECRET) {
    CSRF_SECRET = await getSecretAsync("CSRF_SECRET");
    if (!CSRF_SECRET) {
      throw new Error("CSRF_SECRET must be set in GCP Secret Manager");
    }
    if (CSRF_SECRET.length < 32) {
      throw new Error("CSRF_SECRET must be at least 32 characters long");
    }
  }
  return CSRF_SECRET;
}

export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function generateCSRFTokenWithSecret(): Promise<string> {
  const secret = await getCSRFSecret();
  const token = generateCSRFToken();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(token)
    .digest("hex");
  return `${token}.${signature}`;
}

export async function verifyCSRFToken(token: string): Promise<boolean> {
  try {
    const secret = await getCSRFSecret();
    const [tokenPart, signature] = token.split(".");

    if (!tokenPart || !signature) {
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(tokenPart)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex")
    );
  } catch {
    return false;
  }
}

export function getCSRFTokenFromRequest(req: any): string | null {
  // Check X-CSRF-Token header first
  const headerToken = req.headers["x-csrf-token"];
  if (headerToken) {
    return headerToken;
  }

  // Check form data
  const formToken = req.body?._csrf;
  if (formToken) {
    return formToken;
  }

  // Check query parameter
  const queryToken = req.query?._csrf;
  if (queryToken) {
    return queryToken;
  }

  return null;
}
