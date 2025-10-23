import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import {
  ErrorType,
  sendErrorResponse,
  sendSuccessResponse,
} from "@/lib/security/error-handling";
import { withAuthenticatedRequest } from "@/lib/security/request-wrapper";
import { eq } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

/**
 * Bulk reorder addresses
 * PUT /api/addresses/reorder - Update sort order for multiple addresses
 */
async function handler(req: NextApiRequest, res: NextApiResponse, user?: any) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { addressOrders } = req.body;

    if (!Array.isArray(addressOrders)) {
      return sendErrorResponse(
        res,
        "addressOrders must be an array",
        ErrorType.VALIDATION_ERROR,
        400
      );
    }

    // Update each address with its new sort order
    for (const { id, sort_order, is_default } of addressOrders) {
      await db
        .update(addresses)
        .set({
          sort_order,
          is_default: is_default || false,
          updated_at: new Date(),
        })
        .where(eq(addresses.id, id));
    }

    // Fetch and return updated addresses (shipping only for checkout)
    const allAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.customer_id, user.id))
      .orderBy(addresses.sort_order, addresses.created_at);

    const shippingAddresses = allAddresses.filter(
      (addr) => addr.type === "shipping"
    );

    // Deduplicate addresses by ID and also by address content to prevent duplicates
    const uniqueAddresses = shippingAddresses.filter(
      (address, index, self) =>
        index ===
        self.findIndex(
          (a) =>
            a.id === address.id ||
            (a.line1 === address.line1 &&
              a.city === address.city &&
              a.region === address.region &&
              a.postal_code === address.postal_code)
        )
    );

    sendSuccessResponse(
      res,
      { addresses: uniqueAddresses },
      "Address order updated successfully"
    );
  } catch (error) {
    console.error("Error reordering addresses:", error);
    return sendErrorResponse(
      res,
      "Failed to reorder addresses",
      ErrorType.INTERNAL_ERROR,
      500
    );
  }
}

export default withAuthenticatedRequest(handler, "reorder_addresses");
