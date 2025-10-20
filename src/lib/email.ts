import nodemailer from "nodemailer";
import { getSecretAsync } from "./encryption/async-secrets";

// Lazy initialization of email transporter
let transporter: nodemailer.Transporter | null = null;
let FROM_EMAIL: string | null = null;
let SITE_URL: string | null = null;

async function initializeEmailTransporter() {
  if (transporter) return;

  const smtpUser = await getSecretAsync("SMTP_USER");
  const smtpPass = await getSecretAsync("SMTP_PASS");
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");

  if (!smtpUser || !smtpPass) {
    throw new Error("SMTP credentials not configured in GCP Secret Manager");
  }

  const EMAIL_CONFIG = {
    host: smtpHost,
    port: smtpPort,
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  };

  FROM_EMAIL =
    (await getSecretAsync("FROM_EMAIL")) || "noreply@raineandsea.com";
  SITE_URL = process.env.SITE_URL || "http://localhost:3000";

  transporter = nodemailer.createTransport(EMAIL_CONFIG);
}

export async function sendVerificationEmail(
  email: string,
  token: string,
  name?: string
) {
  try {
    await initializeEmailTransporter();
    const verificationUrl = `${SITE_URL}/auth/verify-email?token=${token}`;

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: email,
      subject: "Verify Your Email Address - RaineAndSea",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Crystal Jewelry & Accessories</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Welcome${name ? `, ${name}` : ""}!
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Thank you for creating an account with RaineAndSea. To complete your registration and start shopping, please verify your email address by clicking the button below.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #3b82f6; margin: 8px 0 0 0; font-size: 14px; word-break: break-all;">
                ${verificationUrl}
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0; padding-top: 20px;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                  <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  If you didn't create an account with us, please ignore this email.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Handmade crystal jewelry shipped from Anacortes, WA
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome${name ? `, ${name}` : ""}!
        
        Thank you for creating an account with RaineAndSea. To complete your registration and start shopping, please verify your email address by visiting this link:
        
        ${verificationUrl}
        
        This verification link will expire in 24 hours for security reasons.
        
        If you didn't create an account with us, please ignore this email.
        
        © 2024 RaineAndSea. All rights reserved.
        Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Verification email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending verification email:", error);
    return { success: false, error: "Failed to send verification email" };
  }
}

export async function sendPasswordResetEmail(
  email: string,
  token: string,
  name?: string
) {
  try {
    await initializeEmailTransporter();
    const resetUrl = `${SITE_URL}/auth/reset-password?token=${token}`;

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: email,
      subject: "Reset Your Password - RaineAndSea",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #fecaca; margin: 8px 0 0 0; font-size: 16px;">Password Reset Request</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Password Reset Request
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Hello${
                  name ? ` ${name}` : ""
                }, we received a request to reset your password for your RaineAndSea account. Click the button below to reset your password.
              </p>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(239, 68, 68, 0.3);">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #ef4444; margin: 8px 0 0 0; font-size: 14px; word-break: break-all;">
                ${resetUrl}
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0; padding-top: 20px;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                  <strong>Security Notice:</strong> This password reset link will expire in 1 hour for security reasons.
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Handmade crystal jewelry shipped from Anacortes, WA
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request
        
        Hello${
          name ? ` ${name}` : ""
        }, we received a request to reset your password for your RaineAndSea account. Visit this link to reset your password:
        
        ${resetUrl}
        
        This password reset link will expire in 1 hour for security reasons.
        
        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        
        © 2024 RaineAndSea. All rights reserved.
        Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Password reset email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return { success: false, error: "Failed to send password reset email" };
  }
}

export async function sendOrderConfirmationEmail({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
  orderItems,
  shippingAddress,
  subtotal,
  tax,
  shipping,
  total,
  isGuestOrder = false,
}: {
  orderId: string;
  orderNumber?: string;
  customerEmail: string;
  customerName?: string;
  orderItems: any[];
  shippingAddress: any;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  isGuestOrder?: boolean;
}) {
  try {
    await initializeEmailTransporter();
    const displayOrderNumber =
      orderNumber || `#${orderId.slice(-8).toUpperCase()}`;

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `Order Confirmation ${displayOrderNumber} - RaineAndSea`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 16px;">Order Confirmation</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Thank you for your order${
                  customerName ? `, ${customerName}` : ""
                }!
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                We've received your order and will begin processing it shortly. Here are your order details:
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Details</h3>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${displayOrderNumber}</p>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> Received</p>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Items Ordered</h3>
                ${orderItems
                  .map(
                    (item) => `
                  <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
                    <p style="color: #1f2937; margin: 0 0 5px 0; font-weight: bold;">${
                      item.descriptive_title || item.product_title || "Product"
                    }</p>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Quantity: ${
                      item.quantity
                    } × $${item.unit_amount.toFixed(2)} = $${(
                      item.unit_amount * item.quantity
                    ).toFixed(2)}</p>
                    ${
                      item.selected_options &&
                      typeof item.selected_options === "object" &&
                      Object.keys(item.selected_options).length > 0
                        ? `
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;"><strong>Options:</strong> ${Object.entries(
                      item.selected_options
                    )
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}</p>
                    `
                        : ""
                    }
                  </div>
                `
                  )
                  .join("")}
              </div>
              
              <!-- Totals -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Subtotal:</span>
                  <span style="color: #1f2937;">$${subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Tax:</span>
                  <span style="color: #1f2937;">$${tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Shipping:</span>
                  <span style="color: #1f2937;">${
                    shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`
                  }</span>
                </div>
                <div style="border-top: 1px solid #d1d5db; padding-top: 10px; margin-top: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #1f2937; font-weight: bold; font-size: 16px;">Total:</span>
                    <span style="color: #1f2937; font-weight: bold; font-size: 16px;">$${total.toFixed(
                      2
                    )}</span>
                  </div>
                </div>
              </div>
              
              <!-- Shipping Address -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Shipping Address</h3>
                <div style="color: #4b5563; line-height: 1.6;">
                  <p style="margin: 0;">${shippingAddress.name}</p>
                  <p style="margin: 0;">${shippingAddress.line1}</p>
                  ${
                    shippingAddress.line2
                      ? `<p style="margin: 0;">${shippingAddress.line2}</p>`
                      : ""
                  }
                  <p style="margin: 0;">${shippingAddress.city}, ${
        shippingAddress.region
      } ${shippingAddress.postal_code}</p>
                  <p style="margin: 0;">${shippingAddress.country}</p>
                </div>
              </div>
              
              <!-- Next Steps -->
              <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">What's Next?</h3>
                <ul style="color: #1e40af; margin: 0; padding-left: 20px;">
                  <li style="margin: 5px 0;">We'll process your order within 1-2 business days</li>
                  <li style="margin: 5px 0;">You'll receive a shipping confirmation email with tracking information</li>
                  <li style="margin: 5px 0;">Your order will be shipped within 3-5 business days</li>
                  <li style="margin: 5px 0;">You can track your order status in your account</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Handmade crystal jewelry shipped from Anacortes, WA
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Order Confirmation ${displayOrderNumber}
        
        Thank you for your order${customerName ? `, ${customerName}` : ""}!
        
        We've received your order and will begin processing it shortly.
        
        Order Details:
        - Order Number: ${displayOrderNumber}
        - Order Date: ${new Date().toLocaleDateString()}
        - Status: Received
        
        Items Ordered:
        ${orderItems
          .map(
            (item) =>
              `- ${item.descriptive_title || "Product"}: ${
                item.quantity
              } × $${item.unit_amount.toFixed(2)} = $${(
                item.unit_amount * item.quantity
              ).toFixed(2)}`
          )
          .join("\n")}
        
        Order Summary:
        - Subtotal: $${subtotal.toFixed(2)}
        - Tax: $${tax.toFixed(2)}
        - Shipping: ${shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
        - Total: $${total.toFixed(2)}
        
        Shipping Address:
        ${shippingAddress.name}
        ${shippingAddress.line1}
        ${shippingAddress.line2 ? shippingAddress.line2 + "\n" : ""}
        ${shippingAddress.city}, ${shippingAddress.region} ${
        shippingAddress.postal_code
      }
        ${shippingAddress.country}
        
        What's Next?
        - We'll process your order within 1-2 business days
        - You'll receive a shipping confirmation email with tracking information
        - Your order will be shipped within 3-5 business days
        - You can track your order status in your account
        
        © 2024 RaineAndSea. All rights reserved.
        Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Order confirmation email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending order confirmation email:", error);
    return { success: false, error: "Failed to send order confirmation email" };
  }
}

export async function sendAdminOrderNotification({
  orderId,
  orderNumber,
  customerEmail,
  customerName,
  orderItems,
  shippingAddress,
  subtotal,
  tax,
  shipping,
  total,
  isGuestOrder = false,
}: {
  orderId: string;
  orderNumber?: string;
  customerEmail: string;
  customerName?: string;
  orderItems: any[];
  shippingAddress: any;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  isGuestOrder?: boolean;
}) {
  try {
    await initializeEmailTransporter();
    const displayOrderNumber =
      orderNumber || `#${orderId.slice(-8).toUpperCase()}`;
    const adminEmail = "noreply.raineandsea+orders@gmail.com";

    const mailOptions = {
      from: `"RaineAndSea Orders" <${FROM_EMAIL}>`,
      to: adminEmail,
      subject: `New Order ${displayOrderNumber} - ${
        customerName || customerEmail
      }`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Notification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #fde68a; margin: 8px 0 0 0; font-size: 16px;">New Order Notification</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                New Order Received!
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                A new order has been placed and requires processing.
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Details</h3>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${displayOrderNumber}</p>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Order ID:</strong> ${orderId}</p>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
                <p style="color: #4b5563; margin: 5px 0; font-size: 14px;"><strong>Status:</strong> Received</p>
              </div>
              
              <!-- Customer Details -->
              <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Customer Information</h3>
                <p style="color: #92400e; margin: 5px 0; font-size: 14px;"><strong>Name:</strong> ${
                  customerName || "N/A"
                }</p>
                <p style="color: #92400e; margin: 5px 0; font-size: 14px;"><strong>Email:</strong> ${customerEmail}</p>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Items Ordered</h3>
                ${orderItems
                  .map(
                    (item) => `
                  <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
                    <p style="color: #1f2937; margin: 0 0 5px 0; font-weight: bold;">${
                      item.descriptive_title || item.product_title || "Product"
                    }</p>
                    <p style="color: #6b7280; margin: 0; font-size: 14px;">Quantity: ${
                      item.quantity
                    } × $${item.unit_amount.toFixed(2)} = $${(
                      item.unit_amount * item.quantity
                    ).toFixed(2)}</p>
                    ${
                      item.selected_options &&
                      typeof item.selected_options === "object" &&
                      Object.keys(item.selected_options).length > 0
                        ? `
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;"><strong>Options:</strong> ${Object.entries(
                      item.selected_options
                    )
                      .map(([key, value]) => `${key}: ${value}`)
                      .join(", ")}</p>
                    `
                        : ""
                    }
                    <p style="color: #6b7280; margin: 5px 0 0 0; font-size: 12px;"><strong>Product ID:</strong> ${
                      item.product_id
                    }</p>
                  </div>
                `
                  )
                  .join("")}
              </div>
              
              <!-- Totals -->
              <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Subtotal:</span>
                  <span style="color: #1f2937;">$${subtotal.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Tax:</span>
                  <span style="color: #1f2937;">$${tax.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563;">Shipping:</span>
                  <span style="color: #1f2937;">${
                    shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`
                  }</span>
                </div>
                <div style="border-top: 1px solid #d1d5db; padding-top: 10px; margin-top: 10px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #1f2937; font-weight: bold; font-size: 16px;">Total:</span>
                    <span style="color: #1f2937; font-weight: bold; font-size: 16px;">$${total.toFixed(
                      2
                    )}</span>
                  </div>
                </div>
              </div>
              
              <!-- Shipping Address -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Shipping Address</h3>
                <div style="color: #4b5563; line-height: 1.6;">
                  <p style="margin: 0;">${shippingAddress.name}</p>
                  <p style="margin: 0;">${shippingAddress.line1}</p>
                  ${
                    shippingAddress.line2
                      ? `<p style="margin: 0;">${shippingAddress.line2}</p>`
                      : ""
                  }
                  <p style="margin: 0;">${shippingAddress.city}, ${
        shippingAddress.region
      } ${shippingAddress.postal_code}</p>
                  <p style="margin: 0;">${shippingAddress.country}</p>
                </div>
              </div>
              
              <!-- Action Required -->
              <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #dc2626; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Action Required</h3>
                <ul style="color: #dc2626; margin: 0; padding-left: 20px;">
                  <li style="margin: 5px 0;">Review order details for accuracy</li>
                  <li style="margin: 5px 0;">Process payment (if not already completed)</li>
                  <li style="margin: 5px 0;">Prepare items for shipping</li>
                  <li style="margin: 5px 0;">Update order status in admin panel</li>
                  <li style="margin: 5px 0;">Send shipping confirmation to customer</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Admin notification - Handmade crystal jewelry shipped from Anacortes, WA
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Order Notification
        
        A new order has been placed and requires processing.
        
        Order Details:
        - Order Number: ${displayOrderNumber}
        - Order ID: ${orderId}
        - Order Date: ${new Date().toLocaleDateString()}
        - Status: Received
        
        Customer Information:
        - Name: ${customerName || "N/A"}
        - Email: ${customerEmail}
        
        Items Ordered:
        ${orderItems
          .map(
            (item) =>
              `- ${item.descriptive_title || "Product"}: ${
                item.quantity
              } × $${item.unit_amount.toFixed(2)} = $${(
                item.unit_amount * item.quantity
              ).toFixed(2)}`
          )
          .join("\n")}
        
        Order Summary:
        - Subtotal: $${subtotal.toFixed(2)}
        - Tax: $${tax.toFixed(2)}
        - Shipping: ${shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
        - Total: $${total.toFixed(2)}
        
        Shipping Address:
        ${shippingAddress.name}
        ${shippingAddress.line1}
        ${shippingAddress.line2 ? shippingAddress.line2 + "\n" : ""}
        ${shippingAddress.city}, ${shippingAddress.region} ${
        shippingAddress.postal_code
      }
        ${shippingAddress.country}
        
        Action Required:
        - Review order details for accuracy
        - Process payment (if not already completed)
        - Prepare items for shipping
        - Update order status in admin panel
        - Send shipping confirmation to customer
        
        © 2024 RaineAndSea. All rights reserved.
        Admin notification - Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Admin order notification sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending admin order notification:", error);
    return { success: false, error: "Failed to send admin order notification" };
  }
}

export async function sendStockNotificationEmail(
  email: string,
  productTitle: string,
  productSlug: string
) {
  try {
    await initializeEmailTransporter();
    const productUrl = `${SITE_URL}/products/${productSlug}`;

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: email,
      subject: `Back in Stock: ${productTitle} - RaineAndSea`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Product Back in Stock</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 16px;">Great News!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Your Item is Back in Stock! 🎉
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Great news! The item you were waiting for is now back in stock and ready for purchase.
              </p>
              
              <!-- Product Details -->
              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
                <h3 style="color: #065f46; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Available Now</h3>
                <p style="color: #065f46; margin: 0; font-size: 16px; font-weight: bold;">${productTitle}</p>
              </div>
              
              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${productUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.3);">
                  Shop Now
                </a>
              </div>
              
              <p style="color: #6b7280; margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
                If the button doesn't work, you can copy and paste this link into your browser:
              </p>
              <p style="color: #10b981; margin: 8px 0 0 0; font-size: 14px; word-break: break-all;">
                ${productUrl}
              </p>
              
              <div style="border-top: 1px solid #e5e7eb; margin: 30px 0; padding-top: 20px;">
                <p style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px;">
                  <strong>Hurry!</strong> Stock is limited and this item may sell out quickly.
                </p>
                <p style="color: #6b7280; margin: 0; font-size: 14px;">
                  You're receiving this email because you signed up for stock notifications. You won't receive any more notifications for this item.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Handmade crystal jewelry shipped from Anacortes, WA
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Great News! Your Item is Back in Stock! 🎉
        
        Great news! The item you were waiting for is now back in stock and ready for purchase.
        
        Available Now: ${productTitle}
        
        Shop now: ${productUrl}
        
        Hurry! Stock is limited and this item may sell out quickly.
        
        You're receiving this email because you signed up for stock notifications. You won't receive any more notifications for this item.
        
        © 2024 RaineAndSea. All rights reserved.
        Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Stock notification email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending stock notification email:", error);
    return { success: false, error: "Failed to send stock notification email" };
  }
}

export async function testEmailConnection() {
  try {
    await initializeEmailTransporter();
    await transporter!.verify();
    console.log("Email service connection verified");
    return { success: true };
  } catch (error) {
    console.error("Email service connection failed:", error);
    return { success: false, error: "Email service not configured" };
  }
}
