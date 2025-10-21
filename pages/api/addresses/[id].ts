import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withSecureApi } from "@/lib/security/security-middleware";
import { and, eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Update or delete a specific address
 * PUT /api/addresses/[id] - Update address
 * DELETE /api/addresses/[id] - Delete address
 */
export default withSecureApi(
  async (req: NextApiRequest, res: NextApiResponse, user?: any) => {
    if (!user) {
      return sendErrorResponse(
        res,
        "Authentication required",
        ErrorType.AUTHENTICATION_ERROR,
        401
      );
    }

    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return sendErrorResponse(
        res,
        "Address ID is required",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    if (req.method === "PUT") {
      try {
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

        // Check if address exists and belongs to user
        const existingAddress = await db
          .select()
          .from(addresses)
          .where(and(eq(addresses.id, id), eq(addresses.customer_id, user.id)))
          .limit(1);

        if (existingAddress.length === 0) {
          return sendErrorResponse(
            res,
            "Address not found",
            ErrorType.NOT_FOUND_ERROR,
            404
          );
        }

        // If this is set as default, unset other defaults of the same type
        if (is_default) {
          await db
            .update(addresses)
            .set({ is_default: false })
            .where(
              and(eq(addresses.customer_id, user.id), eq(addresses.type, type))
            );
        }

        // Update address
        const [updatedAddress] = await db
          .update(addresses)
          .set({
            type,
            name: name || null,
            line1,
            line2: line2 || null,
            city,
            region,
            postal_code,
            country,
            is_default: is_default || false,
            sort_order: sort_order !== undefined ? sort_order : 0,
            updated_at: new Date(),
          })
          .where(and(eq(addresses.id, id), eq(addresses.customer_id, user.id)))
          .returning();

        sendSuccessResponse(
          res,
          updatedAddress,
          "Address updated successfully"
        );
      } catch (error) {
        console.error("Error updating address:", error);
        return sendErrorResponse(
          res,
          "Failed to update address",
          ErrorType.INTERNAL_ERROR,
          500
        );
      }
    } else if (req.method === "DELETE") {
      try {
        // Check if address exists and belongs to user
        const existingAddress = await db
          .select()
          .from(addresses)
          .where(and(eq(addresses.id, id), eq(addresses.customer_id, user.id)))
          .limit(1);

        if (existingAddress.length === 0) {
          return sendErrorResponse(
            res,
            "Address not found",
            ErrorType.NOT_FOUND_ERROR,
            404
          );
        }

        // Delete address
        await db
          .delete(addresses)
          .where(and(eq(addresses.id, id), eq(addresses.customer_id, user.id)));

        sendSuccessResponse(res, { id }, "Address deleted successfully");
      } catch (error) {
        console.error("Error deleting address:", error);
        return sendErrorResponse(
          res,
          "Failed to delete address",
          ErrorType.INTERNAL_ERROR,
          500
        );
      }
    } else {
      return res.status(405).json({ error: "Method not allowed" });
    }
  }
);
