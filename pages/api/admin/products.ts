import { db } from "@/lib/db";
import {
  categories,
  inventory,
  productAnalytics,
  productCategories,
  productMedia,
  products,
  productTags,
  tags,
} from "@/lib/db/schema";
import { getProductImageUrl } from "@/lib/image-utils";
import { AuthenticatedUser, withAdminProtection } from "@/lib/role-middleware";
import { and, asc, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { NextApiRequest, NextApiResponse } from "next";

async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
) {
  if (req.method === "GET") {
    // Get all products with advanced filtering
    try {
      const {
        search,
        status,
        tags: tagIds,
        categories: categoryIds,
        stockStatus,
        sortBy = "created_at",
        sortOrder = "desc",
        page = "1",
        limit = "50",
      } = req.query;

      // Build where conditions
      const conditions = [];

      // Text search (ID, title, slug, description)
      if (search && typeof search === "string") {
        const searchTerm = search.trim();
        // Check if search term looks like a UUID
        const isUUID =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            searchTerm
          );

        if (isUUID) {
          // Exact match for UUID
          conditions.push(eq(products.id, searchTerm));
        } else {
          // Text search for other fields
          conditions.push(
            or(
              ilike(products.title, `%${searchTerm}%`),
              ilike(products.slug, `%${searchTerm}%`),
              ilike(products.description, `%${searchTerm}%`)
            )
          );
        }
      }

      // Status filter
      if (status && typeof status === "string" && status !== "all") {
        conditions.push(eq(products.status, status as any));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Get products with filters using distinct to avoid duplicates
      let query = db
        .selectDistinct({
          id: products.id,
          slug: products.slug,
          title: products.title,
          description: products.description,
          image: products.image,
          base_price: products.base_price,
          status: products.status,
          created_at: products.created_at,
          updated_at: products.updated_at,
          quantity_available: inventory.quantity_available,
          quantity_reserved: inventory.quantity_reserved,
          total_sales: productAnalytics.total_sales,
          total_orders: productAnalytics.total_orders,
          total_revenue: productAnalytics.total_revenue,
          views_count: productAnalytics.views_count,
          last_sale_at: productAnalytics.last_sale_at,
          media_blob_url: productMedia.blob_url,
        })
        .from(products)
        .leftJoin(inventory, eq(products.id, inventory.product_id))
        .leftJoin(
          productAnalytics,
          eq(products.id, productAnalytics.product_id)
        )
        .leftJoin(
          productMedia,
          and(
            eq(products.id, productMedia.product_id),
            eq(productMedia.sort, 0) // Get the first (primary) image
          )
        )
        .$dynamic();

      if (whereClause) {
        query = query.where(whereClause);
      }

      // Sorting
      let sortColumn;
      switch (sortBy) {
        case "title":
          sortColumn = products.title;
          break;
        case "status":
          sortColumn = products.status;
          break;
        case "price":
          sortColumn = products.base_price;
          break;
        case "stock":
          sortColumn = inventory.quantity_available;
          break;
        case "sales":
          sortColumn = productAnalytics.total_sales;
          break;
        case "created_at":
        default:
          sortColumn = products.created_at;
          break;
      }

      query =
        sortOrder === "asc"
          ? query.orderBy(asc(sortColumn))
          : query.orderBy(desc(sortColumn));

      let allProducts = await query;

      // Filter by tags if specified
      if (tagIds) {
        const tagIdArray = Array.isArray(tagIds) ? tagIds : [tagIds];
        const productsWithTags = await db
          .select({ product_id: productTags.product_id })
          .from(productTags)
          .where(inArray(productTags.tag_id, tagIdArray));

        const productIdsWithTags = new Set(
          productsWithTags.map((p) => p.product_id)
        );
        allProducts = allProducts.filter((p) => productIdsWithTags.has(p.id));
      }

      // Filter by categories if specified
      if (categoryIds) {
        const categoryIdArray = Array.isArray(categoryIds)
          ? categoryIds
          : [categoryIds];
        const productsWithCategories = await db
          .select({ product_id: productCategories.product_id })
          .from(productCategories)
          .where(inArray(productCategories.category_id, categoryIdArray));

        const productIdsWithCategories = new Set(
          productsWithCategories.map((p) => p.product_id)
        );
        allProducts = allProducts.filter((p) =>
          productIdsWithCategories.has(p.id)
        );
      }

      // Filter by stock status
      if (stockStatus && typeof stockStatus === "string") {
        if (stockStatus === "in_stock") {
          allProducts = allProducts.filter(
            (p) => (p.quantity_available || 0) > 10
          );
        } else if (stockStatus === "low_stock") {
          allProducts = allProducts.filter(
            (p) =>
              (p.quantity_available || 0) > 0 &&
              (p.quantity_available || 0) <= 10
          );
        } else if (stockStatus === "out_of_stock") {
          allProducts = allProducts.filter(
            (p) => (p.quantity_available || 0) === 0
          );
        }
      }

      // Get tags for all products
      const productTagsData = await db
        .select({
          product_id: productTags.product_id,
          tag_id: productTags.tag_id,
          tag_name: tags.name,
          tag_id_field: tags.id,
        })
        .from(productTags)
        .innerJoin(tags, eq(productTags.tag_id, tags.id));

      // Get categories for all products
      const productCategoriesData = await db
        .select({
          product_id: productCategories.product_id,
          category_id: productCategories.category_id,
          category_name: categories.name,
          category_id_field: categories.id,
        })
        .from(productCategories)
        .innerJoin(
          categories,
          eq(productCategories.category_id, categories.id)
        );

      // Group tags by product
      const tagsByProduct = productTagsData.reduce((acc, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = [];
        }
        acc[item.product_id].push({
          id: item.tag_id_field,
          name: item.tag_name,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; name: string }>>);

      // Group categories by product
      const categoriesByProduct = productCategoriesData.reduce((acc, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = [];
        }
        acc[item.product_id].push({
          id: item.category_id_field,
          name: item.category_name,
        });
        return acc;
      }, {} as Record<string, Array<{ id: string; name: string }>>);

      // Pagination
      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const offset = (pageNum - 1) * limitNum;
      const total = allProducts.length;
      const totalPages = Math.ceil(total / limitNum);

      const paginatedProducts = allProducts.slice(offset, offset + limitNum);

      // Combine products with their tags, categories, inventory, and analytics
      const productsWithData = paginatedProducts.map((product) => ({
        ...product,
        image: getProductImageUrl(product.image, product.media_blob_url),
        base_price: product.base_price ? parseFloat(product.base_price) : null,
        tags: tagsByProduct[product.id] || [],
        categories: categoriesByProduct[product.id] || [],
        inventory: {
          quantity_available: product.quantity_available || 0,
          quantity_reserved: product.quantity_reserved || 0,
        },
        analytics: {
          total_sales: product.total_sales || 0,
          total_orders: product.total_orders || 0,
          total_revenue: product.total_revenue
            ? parseFloat(product.total_revenue)
            : 0,
          views_count: product.views_count || 0,
          last_sale_at: product.last_sale_at,
        },
      }));

      return res.status(200).json({
        products: productsWithData,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error("Get products error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "POST") {
    // Create new product
    try {
      const { title, slug, description, image, status, tags } = req.body;

      if (!title || !slug || !description) {
        return res.status(400).json({
          error: "Title, slug, and description are required",
        });
      }

      // Check if slug already exists
      const existingProduct = await db
        .select()
        .from(products)
        .where(eq(products.slug, slug))
        .limit(1);

      if (existingProduct.length > 0) {
        return res.status(409).json({
          error: "Product with this slug already exists",
        });
      }

      // Create product
      const newProduct = await db
        .insert(products)
        .values({
          title,
          slug,
          description,
          image: image || null,
          status: status || "draft",
        })
        .returning();

      // Add tags if provided
      if (tags && tags.length > 0) {
        const tagInserts = tags.map((tagId: string) => ({
          product_id: newProduct[0].id,
          tag_id: tagId,
        }));

        await db.insert(productTags).values(tagInserts);
      }

      return res.status(201).json({
        message: "Product created successfully",
        product: {
          id: newProduct[0].id,
          slug: newProduct[0].slug,
          title: newProduct[0].title,
          description: newProduct[0].description,
          image: newProduct[0].image,
          status: newProduct[0].status,
        },
      });
    } catch (error) {
      console.error("Create product error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  if (req.method === "DELETE") {
    // Delete multiple products by IDs
    try {
      const { productIds } = req.body;

      if (
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
      ) {
        return res.status(400).json({
          error: "Product IDs array is required",
        });
      }

      // Delete products (cascade will handle related records)
      const deletedProducts = await db
        .delete(products)
        .where(inArray(products.id, productIds))
        .returning();

      return res.status(200).json({
        message: `${deletedProducts.length} products deleted successfully`,
        deletedCount: deletedProducts.length,
      });
    } catch (error) {
      console.error("Delete products error:", error);
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}

export default withAdminProtection(handler);
