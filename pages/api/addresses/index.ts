import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withSecureApi } from "@/lib/security/security-middleware";
import { eq, max } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Get user's saved addresses
 * POST /api/addresses - Create new address
 */
export default withSecureApi(
  async (req: NextApiRequest, res: NextApiResponse, user?: any) => {
    if (req.method === "GET") {
      try {
        if (!user) {
          return sendErrorResponse(
            res,
            "Authentication required",
            ErrorType.AUTHENTICATION_ERROR,
            401
          );
        }

        // Get user's saved addresses
        const userAddresses = await db
          .select()
          .from(addresses)
          .where(eq(addresses.customer_id, user.id))
          .orderBy(addresses.sort_order, addresses.created_at);

        // Group addresses by type
        const shippingAddresses = userAddresses.filter(
          (addr) => addr.type === "shipping"
        );
        const billingAddresses = userAddresses.filter(
          (addr) => addr.type === "billing"
        );

        sendSuccessResponse(
          res,
          {
            shipping: shippingAddresses,
            billing: billingAddresses,
            all: userAddresses,
          },
          "Addresses retrieved successfully"
        );
      } catch (error) {
        console.error("Error fetching addresses:", error);
        return sendErrorResponse(
          res,
          "Failed to fetch addresses",
          ErrorType.INTERNAL_ERROR,
          500
        );
      }
    } else if (req.method === "POST") {
      try {
        if (!user) {
          return sendErrorResponse(
            res,
            "Authentication required",
            ErrorType.AUTHENTICATION_ERROR,
            401
          );
        }

        const {
          type,
          name,
          line1,
          line2,
          city,
          region,
          postal_code,
          country,
          is_default,
          sort_order,
        } = req.body;

        // Validate required fields
        if (!type || !line1 || !city || !region || !postal_code || !country) {
          return sendErrorResponse(
            res,
            "Missing required address fields",
            ErrorType.VALIDATION_ERROR,
            400
          );
        }

        if (!["shipping", "billing"].includes(type)) {
          return sendErrorResponse(
            res,
            "Invalid address type",
            ErrorType.VALIDATION_ERROR,
            400
          );
        }

        // If this is set as default, unset other defaults of the same type
        if (is_default) {
          await db
            .update(addresses)
            .set({ is_default: false })
            .where(eq(addresses.customer_id, user.id));
        }

        // Get the next sort order if not provided
        let nextSortOrder = sort_order;
        if (nextSortOrder === undefined) {
          const maxSortOrder = await db
            .select({ max: max(addresses.sort_order) })
            .from(addresses)
            .where(eq(addresses.customer_id, user.id));
          nextSortOrder = (maxSortOrder[0]?.max || 0) + 1;
        }

        // Create new address
        const [newAddress] = await db
          .insert(addresses)
          .values({
            customer_id: user.id,
            type,
            name: name || null,
            line1,
            line2: line2 || null,
            city,
            region,
            postal_code,
            country,
            is_default: is_default || false,
            sort_order: nextSortOrder,
          })
          .returning();

        sendSuccessResponse(
          res,
          newAddress,
          "Address created successfully",
          201
        );
      } catch (error) {
        console.error("Error creating address:", error);
        return sendErrorResponse(
          res,
          "Failed to create address",
          ErrorType.INTERNAL_ERROR,
          500
        );
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  }
);
