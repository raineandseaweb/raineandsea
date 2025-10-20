import nodemailer from "nodemailer";
import { getSecretAsync } from "../encryption/async-secrets";

// Lazy initialization of email transporter
let transporter: nodemailer.Transporter | null = null;
let FROM_EMAIL: string | null = null;
const ADMIN_EMAIL = "noreply.raineandsea+orders@gmail.com";
const SITE_URL = process.env.SITE_URL || "http://localhost:3000";

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

  transporter = nodemailer.createTransport(EMAIL_CONFIG);
}

export interface OrderConfirmationData {
  orderId: string;
  customerEmail: string;
  customerName?: string;
  orderItems: Array<{
    variant_id: string;
    quantity: number;
    unit_amount: number;
    selected_options?: Record<string, string>;
  }>;
  shippingAddress: {
    name: string;
    email: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

export interface AdminOrderNotificationData extends OrderConfirmationData {}

export interface ShippingConfirmationData {
  orderId: string;
  orderNumber?: string;
  customerEmail: string;
  customerName?: string;
  trackingNumber: string;
  shippingProvider: string;
  trackingUrl: string;
  orderItems: Array<{
    variant_id: string;
    quantity: number;
    unit_amount: number;
    selected_options?: Record<string, string>;
    descriptive_title?: string;
  }>;
  shippingAddress: {
    name: string;
    email: string;
    phone?: string;
    line1: string;
    line2?: string;
    city: string;
    region: string;
    postal_code: string;
    country: string;
  };
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(data: OrderConfirmationData) {
  try {
    await initializeEmailTransporter();
    const orderNumber = `#${data.orderId.slice(-8).toUpperCase()}`;
    const orderDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Order Confirmation ${orderNumber} - RaineAndSea`,
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
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #e0e7ff; margin: 8px 0 0 0; font-size: 16px;">Crystal Jewelry & Accessories</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Order Confirmation
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Thank you for your order${
                  data.customerName ? `, ${data.customerName}` : ""
                }! We've received your order and will begin processing it shortly.
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Details</h3>
                <p style="color: #4b5563; margin: 0 0 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${orderNumber}</p>
                <p style="color: #4b5563; margin: 0 0 5px 0; font-size: 14px;"><strong>Order Date:</strong> ${orderDate}</p>
                <p style="color: #4b5563; margin: 0 0 5px 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Confirmed</span></p>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Items</h3>
                ${data.orderItems
                  .map(
                    (item) => `
                  <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <p style="color: #1f2937; margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">Item ${item.variant_id.slice(
                          -8
                        )}</p>
                        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Quantity: ${
                          item.quantity
                        }</p>
                        ${
                          item.selected_options
                            ? `
                          <p style="color: #6b7280; margin: 0; font-size: 14px;">Options: ${
                            Object.keys(item.selected_options).length
                          } selected</p>
                        `
                            : ""
                        }
                      </div>
                      <div style="text-align: right;">
                        <p style="color: #1f2937; margin: 0; font-size: 16px; font-weight: bold;">$${(
                          item.unit_amount * item.quantity
                        ).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              
              <!-- Order Summary -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Summary</h3>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Subtotal:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.subtotal.toFixed(
                    2
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Tax:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.tax.toFixed(
                    2
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Shipping:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.shipping.toFixed(
                    2
                  )}</span>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #1f2937; font-size: 16px; font-weight: bold;">Total:</span>
                  <span style="color: #1f2937; font-size: 16px; font-weight: bold;">$${data.total.toFixed(
                    2
                  )}</span>
                </div>
              </div>
              
              <!-- Shipping Address -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Shipping Address</h3>
                <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 5px 0; font-weight: bold;">${
                    data.shippingAddress.name
                  }</p>
                  <p style="margin: 0 0 5px 0;">${
                    data.shippingAddress.line1
                  }</p>
                  ${
                    data.shippingAddress.line2
                      ? `<p style="margin: 0 0 5px 0;">${data.shippingAddress.line2}</p>`
                      : ""
                  }
                  <p style="margin: 0 0 5px 0;">${data.shippingAddress.city}, ${
        data.shippingAddress.region
      } ${data.shippingAddress.postal_code}</p>
                  <p style="margin: 0;">${data.shippingAddress.country}</p>
                </div>
              </div>
              
              <!-- Next Steps -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">What's Next?</h3>
                <ul style="color: #1e40af; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>We'll process your order within 1-2 business days</li>
                  <li>You'll receive a shipping confirmation email with tracking information</li>
                  <li>Your order will be shipped within 3-5 business days</li>
                  <li>You can track your order status in your account</li>
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
        Order Confirmation ${orderNumber}
        
        Thank you for your order${
          data.customerName ? `, ${data.customerName}` : ""
        }! We've received your order and will begin processing it shortly.
        
        Order Details:
        - Order Number: ${orderNumber}
        - Order Date: ${orderDate}
        - Status: Confirmed
        
        Order Items:
        ${data.orderItems
          .map(
            (item) =>
              `- Item ${item.variant_id.slice(-8)} (Qty: ${
                item.quantity
              }) - $${(item.unit_amount * item.quantity).toFixed(2)}`
          )
          .join("\n")}
        
        Order Summary:
        - Subtotal: $${data.subtotal.toFixed(2)}
        - Tax: $${data.tax.toFixed(2)}
        - Shipping: $${data.shipping.toFixed(2)}
        - Total: $${data.total.toFixed(2)}
        
        Shipping Address:
        ${data.shippingAddress.name}
        ${data.shippingAddress.line1}
        ${data.shippingAddress.line2 ? data.shippingAddress.line2 + "\n" : ""}
        ${data.shippingAddress.city}, ${data.shippingAddress.region} ${
        data.shippingAddress.postal_code
      }
        ${data.shippingAddress.country}
        
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

/**
 * Send admin notification email for new orders
 */
export async function sendAdminOrderNotification(
  data: AdminOrderNotificationData
) {
  try {
    await initializeEmailTransporter();
    const orderNumber = `#${data.orderId.slice(-8).toUpperCase()}`;
    const orderDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const mailOptions = {
      from: `"RaineAndSea Orders" <${FROM_EMAIL}>`,
      to: ADMIN_EMAIL,
      subject: `New Order ${orderNumber} - ${
        data.customerName || data.customerEmail
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
            <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">New Order Received</h1>
              <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 16px;">RaineAndSea Order Notification</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Order ${orderNumber}
              </h2>
              
              <!-- Order Details -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Information</h3>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${orderNumber}</p>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Order Date:</strong> ${orderDate}</p>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Customer:</strong> ${
                  data.customerName || "N/A"
                } (${data.customerEmail})</p>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Total:</strong> $${data.total.toFixed(
                  2
                )}</p>
                <p style="color: #166534; margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Confirmed</span></p>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Items</h3>
                ${data.orderItems
                  .map(
                    (item) => `
                  <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <p style="color: #1f2937; margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">Variant ID: ${
                          item.variant_id
                        }</p>
                        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Quantity: ${
                          item.quantity
                        }</p>
                        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Unit Price: $${item.unit_amount.toFixed(
                          2
                        )}</p>
                        ${
                          item.selected_options
                            ? `
                          <p style="color: #6b7280; margin: 0; font-size: 14px;">Options: ${
                            Object.keys(item.selected_options).length
                          } selected</p>
                        `
                            : ""
                        }
                      </div>
                      <div style="text-align: right;">
                        <p style="color: #1f2937; margin: 0; font-size: 16px; font-weight: bold;">$${(
                          item.unit_amount * item.quantity
                        ).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              
              <!-- Order Summary -->
              <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Summary</h3>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Subtotal:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.subtotal.toFixed(
                    2
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Tax:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.tax.toFixed(
                    2
                  )}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #4b5563; font-size: 14px;">Shipping:</span>
                  <span style="color: #1f2937; font-size: 14px; font-weight: bold;">$${data.shipping.toFixed(
                    2
                  )}</span>
                </div>
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 10px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span style="color: #1f2937; font-size: 16px; font-weight: bold;">Total:</span>
                  <span style="color: #1f2937; font-size: 16px; font-weight: bold;">$${data.total.toFixed(
                    2
                  )}</span>
                </div>
              </div>
              
              <!-- Customer Information -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Customer Information</h3>
                <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 5px 0;"><strong>Name:</strong> ${
                    data.customerName || "N/A"
                  }</p>
                  <p style="margin: 0 0 5px 0;"><strong>Email:</strong> ${
                    data.customerEmail
                  }</p>
                  ${
                    data.shippingAddress.phone
                      ? `<p style="margin: 0 0 5px 0;"><strong>Phone:</strong> ${data.shippingAddress.phone}</p>`
                      : ""
                  }
                </div>
              </div>
              
              <!-- Shipping Address -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Shipping Address</h3>
                <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 5px 0; font-weight: bold;">${
                    data.shippingAddress.name
                  }</p>
                  <p style="margin: 0 0 5px 0;">${
                    data.shippingAddress.line1
                  }</p>
                  ${
                    data.shippingAddress.line2
                      ? `<p style="margin: 0 0 5px 0;">${data.shippingAddress.line2}</p>`
                      : ""
                  }
                  <p style="margin: 0 0 5px 0;">${data.shippingAddress.city}, ${
        data.shippingAddress.region
      } ${data.shippingAddress.postal_code}</p>
                  <p style="margin: 0;">${data.shippingAddress.country}</p>
                </div>
              </div>
              
              <!-- Action Required -->
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Action Required</h3>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>Review order details and customer information</li>
                  <li>Process payment (when Stripe is integrated)</li>
                  <li>Prepare items for shipping</li>
                  <li>Update order status in admin panel</li>
                  <li>Send shipping confirmation to customer</li>
                </ul>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0 0 8px 0; font-size: 14px;">
                © 2024 RaineAndSea. All rights reserved.
              </p>
              <p style="color: #9ca3af; margin: 0; font-size: 12px;">
                Admin Order Notification System
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        New Order ${orderNumber}
        
        Order Information:
        - Order Number: ${orderNumber}
        - Order Date: ${orderDate}
        - Customer: ${data.customerName || "N/A"} (${data.customerEmail})
        - Total: $${data.total.toFixed(2)}
        - Status: Confirmed
        
        Order Items:
        ${data.orderItems
          .map(
            (item) =>
              `- Variant ID: ${item.variant_id} (Qty: ${item.quantity}) - $${(
                item.unit_amount * item.quantity
              ).toFixed(2)}`
          )
          .join("\n")}
        
        Order Summary:
        - Subtotal: $${data.subtotal.toFixed(2)}
        - Tax: $${data.tax.toFixed(2)}
        - Shipping: $${data.shipping.toFixed(2)}
        - Total: $${data.total.toFixed(2)}
        
        Customer Information:
        - Name: ${data.customerName || "N/A"}
        - Email: ${data.customerEmail}
        ${
          data.shippingAddress.phone
            ? `- Phone: ${data.shippingAddress.phone}`
            : ""
        }
        
        Shipping Address:
        ${data.shippingAddress.name}
        ${data.shippingAddress.line1}
        ${data.shippingAddress.line2 ? data.shippingAddress.line2 + "\n" : ""}
        ${data.shippingAddress.city}, ${data.shippingAddress.region} ${
        data.shippingAddress.postal_code
      }
        ${data.shippingAddress.country}
        
        Action Required:
        - Review order details and customer information
        - Process payment (when Stripe is integrated)
        - Prepare items for shipping
        - Update order status in admin panel
        - Send shipping confirmation to customer
        
        © 2024 RaineAndSea. All rights reserved.
        Admin Order Notification System
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Admin order notification email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending admin order notification email:", error);
    return {
      success: false,
      error: "Failed to send admin order notification email",
    };
  }
}

/**
 * Send shipping confirmation email to customer
 */
export async function sendShippingConfirmationEmail(
  data: ShippingConfirmationData
) {
  try {
    await initializeEmailTransporter();
    const orderNumber =
      data.orderNumber || `#${data.orderId.slice(-8).toUpperCase()}`;
    const shippedDate = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const getProviderDisplayName = (provider: string) => {
      switch (provider.toLowerCase()) {
        case "usps":
          return "USPS";
        case "ups":
          return "UPS";
        case "fedex":
          return "FedEx";
        default:
          return "Shipping Provider";
      }
    };

    const mailOptions = {
      from: `"RaineAndSea" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `Your Order Has Shipped ${orderNumber} - RaineAndSea`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Shipped</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f9fafb;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 20px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">RaineAndSea</h1>
              <p style="color: #a7f3d0; margin: 8px 0 0 0; font-size: 16px;">Your Order Has Shipped!</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 20px;">
              <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px; font-weight: bold;">
                Great news${data.customerName ? `, ${data.customerName}` : ""}!
              </h2>
              
              <p style="color: #4b5563; margin: 0 0 20px 0; font-size: 16px; line-height: 1.6;">
                Your order has been shipped and is on its way to you. You can track your package using the information below.
              </p>
              
              <!-- Order Details -->
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Order Information</h3>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Order Number:</strong> ${orderNumber}</p>
                <p style="color: #166534; margin: 0 0 5px 0; font-size: 14px;"><strong>Shipped Date:</strong> ${shippedDate}</p>
                <p style="color: #166534; margin: 0; font-size: 14px;"><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">Shipped</span></p>
              </div>
              
              <!-- Tracking Information -->
              <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Tracking Information</h3>
                <p style="color: #1e40af; margin: 0 0 10px 0; font-size: 14px;"><strong>Tracking Number:</strong> ${
                  data.trackingNumber
                }</p>
                <p style="color: #1e40af; margin: 0 0 15px 0; font-size: 14px;"><strong>Shipping Provider:</strong> ${getProviderDisplayName(
                  data.shippingProvider
                )}</p>
                
                <!-- Track Package Button -->
                <div style="text-align: center; margin: 20px 0;">
                  <a href="${
                    data.trackingUrl
                  }" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #6366f1 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.3);">
                    Track Your Package
                  </a>
                </div>
                
                <p style="color: #6b7280; margin: 15px 0 0 0; font-size: 12px; line-height: 1.6;">
                  You can also copy and paste this tracking number directly into the ${getProviderDisplayName(
                    data.shippingProvider
                  )} website: <strong>${data.trackingNumber}</strong>
                </p>
              </div>
              
              <!-- Order Items -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Items Shipped</h3>
                ${data.orderItems
                  .map(
                    (item) => `
                  <div style="border-bottom: 1px solid #e5e7eb; padding: 15px 0;">
                    <div style="display: flex; justify-content: space-between; align-items: start;">
                      <div>
                        <p style="color: #1f2937; margin: 0 0 5px 0; font-size: 16px; font-weight: bold;">${
                          item.descriptive_title ||
                          `Item ${item.variant_id.slice(-8)}`
                        }</p>
                        <p style="color: #6b7280; margin: 0 0 5px 0; font-size: 14px;">Quantity: ${
                          item.quantity
                        }</p>
                        ${
                          item.selected_options &&
                          Object.keys(item.selected_options).length > 0
                            ? `
                        <p style="color: #6b7280; margin: 0; font-size: 12px;"><strong>Options:</strong> ${Object.entries(
                          item.selected_options
                        )
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(", ")}</p>
                        `
                            : ""
                        }
                      </div>
                      <div style="text-align: right;">
                        <p style="color: #1f2937; margin: 0; font-size: 16px; font-weight: bold;">$${(
                          item.unit_amount * item.quantity
                        ).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                `
                  )
                  .join("")}
              </div>
              
              <!-- Shipping Address -->
              <div style="margin: 20px 0;">
                <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px; font-weight: bold;">Shipping Address</h3>
                <div style="color: #4b5563; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 5px 0; font-weight: bold;">${
                    data.shippingAddress.name
                  }</p>
                  <p style="margin: 0 0 5px 0;">${
                    data.shippingAddress.line1
                  }</p>
                  ${
                    data.shippingAddress.line2
                      ? `<p style="margin: 0 0 5px 0;">${data.shippingAddress.line2}</p>`
                      : ""
                  }
                  <p style="margin: 0 0 5px 0;">${data.shippingAddress.city}, ${
        data.shippingAddress.region
      } ${data.shippingAddress.postal_code}</p>
                  <p style="margin: 0;">${data.shippingAddress.country}</p>
                </div>
              </div>
              
              <!-- Delivery Information -->
              <div style="background-color: #fef3c7; border: 1px solid #fcd34d; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px; font-weight: bold;">Delivery Information</h3>
                <ul style="color: #92400e; margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.6;">
                  <li>Your package is now in transit</li>
                  <li>Typical delivery time is 3-7 business days</li>
                  <li>You can track your package using the link above</li>
                  <li>Someone will need to be available to receive the package</li>
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
        Your Order Has Shipped ${orderNumber}
        
        Great news${data.customerName ? `, ${data.customerName}` : ""}!
        
        Your order has been shipped and is on its way to you.
        
        Order Information:
        - Order Number: ${orderNumber}
        - Shipped Date: ${shippedDate}
        - Status: Shipped
        
        Tracking Information:
        - Tracking Number: ${data.trackingNumber}
        - Shipping Provider: ${getProviderDisplayName(data.shippingProvider)}
        - Track Your Package: ${data.trackingUrl}
        
        Items Shipped:
        ${data.orderItems
          .map(
            (item) =>
              `- ${
                item.descriptive_title || `Item ${item.variant_id.slice(-8)}`
              }: ${item.quantity} × $${item.unit_amount.toFixed(2)} = $${(
                item.unit_amount * item.quantity
              ).toFixed(2)}`
          )
          .join("\n")}
        
        Shipping Address:
        ${data.shippingAddress.name}
        ${data.shippingAddress.line1}
        ${data.shippingAddress.line2 ? data.shippingAddress.line2 + "\n" : ""}
        ${data.shippingAddress.city}, ${data.shippingAddress.region} ${
        data.shippingAddress.postal_code
      }
        ${data.shippingAddress.country}
        
        Delivery Information:
        - Your package is now in transit
        - Typical delivery time is 3-7 business days
        - You can track your package using the link above
        - Someone will need to be available to receive the package
        
        © 2024 RaineAndSea. All rights reserved.
        Handmade crystal jewelry shipped from Anacortes, WA
      `,
    };

    const result = await transporter!.sendMail(mailOptions);
    console.log("Shipping confirmation email sent:", result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Error sending shipping confirmation email:", error);
    return {
      success: false,
      error: "Failed to send shipping confirmation email",
    };
  }
}
