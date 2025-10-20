import { relations } from "drizzle-orm";
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Products table
export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    image: text("image"), // Primary product image
    base_price: decimal("base_price", { precision: 10, scale: 2 }),
    status: text("status", { enum: ["active", "inactive", "draft"] })
      .notNull()
      .default("draft"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("products_slug_idx").on(table.slug),
    statusIdx: index("products_status_idx").on(table.status),
    // Composite index for common query patterns
    statusCreatedIdx: index("products_status_created_idx").on(
      table.status,
      table.created_at
    ),
  })
);

// Product media table
export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    blob_url: text("blob_url").notNull(),
    alt: text("alt").notNull(),
    sort: integer("sort").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("product_media_product_idx").on(table.product_id),
    sortIdx: index("product_media_sort_idx").on(table.sort),
  })
);

// Product options table (for crystal selection, size, etc.)
export const productOptions = pgTable(
  "product_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "crystal_type", "size", "color"
    display_name: text("display_name").notNull(), // e.g., "Select Crystal"
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("product_options_product_idx").on(table.product_id),
    sortIdx: index("product_options_sort_idx").on(table.sort_order),
  })
);

// Product option values table (individual crystal options)
export const productOptionValues = pgTable(
  "product_option_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    option_id: uuid("option_id")
      .notNull()
      .references(() => productOptions.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Rose Quartz", "Amethyst"
    price_adjustment: decimal("price_adjustment", { precision: 10, scale: 2 })
      .notNull()
      .default("0"), // +$0, +$3.50, etc.
    is_default: boolean("is_default").notNull().default(false),
    is_sold_out: boolean("is_sold_out").notNull().default(false),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    optionIdx: index("product_option_values_option_idx").on(table.option_id),
    sortIdx: index("product_option_values_sort_idx").on(table.sort_order),
  })
);

// Product crystals table (available crystals for each product)
export const productCrystals = pgTable(
  "product_crystals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // e.g., "Rose Quartz", "Amethyst"
    price_adjustment: decimal("price_adjustment", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    is_default: boolean("is_default").notNull().default(false),
    is_available: boolean("is_available").notNull().default(true),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("product_crystals_product_idx").on(table.product_id),
    sortIdx: index("product_crystals_sort_idx").on(table.sort_order),
  })
);

// Prices table
export const prices = pgTable(
  "prices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    currency: text("currency").notNull().default("USD"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    compare_at_amount: decimal("compare_at_amount", {
      precision: 10,
      scale: 2,
    }),
    starts_at: timestamp("starts_at"),
    ends_at: timestamp("ends_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("prices_product_idx").on(table.product_id),
    currencyIdx: index("prices_currency_idx").on(table.currency),
  })
);

// Inventory table
export const inventory = pgTable(
  "inventory",
  {
    product_id: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    location_id: text("location_id").notNull().default("default"),
    quantity_available: integer("quantity_available").notNull().default(0),
    quantity_reserved: integer("quantity_reserved").notNull().default(0),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    locationIdx: index("inventory_location_idx").on(table.location_id),
  })
);

// Categories table
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    description: text("description"),
    thumbnail: text("thumbnail"), // URL to example product image
    parent_id: uuid("parent_id"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: index("categories_slug_idx").on(table.slug),
    parentIdx: index("categories_parent_idx").on(table.parent_id),
  })
);

// Product categories junction table
export const productCategories = pgTable(
  "product_categories",
  {
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: index("product_categories_pk").on(table.product_id, table.category_id),
  })
);

// Tags table
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    color: text("color").default("#3B82F6"), // Default blue color
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    nameIdx: index("tags_name_idx").on(table.name),
  })
);

// Product tags junction table
export const productTags = pgTable(
  "product_tags",
  {
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    tag_id: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: index("product_tags_pk").on(table.product_id, table.tag_id),
  })
);

// Customers table
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    name: text("name"),
    phone: text("phone"),
    password: text("password"),
    role: text("role").default("user").notNull(),
    email_verified: timestamp("email_verified"),
    email_verification_token: text("email_verification_token"),
    email_verification_expires: timestamp("email_verification_expires"),
    password_reset_token: text("password_reset_token"),
    password_reset_expires: timestamp("password_reset_expires"),
    image: text("image"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("customers_email_idx").on(table.email),
    roleIdx: index("customers_role_idx").on(table.role),
    emailVerificationIdx: index("customers_email_verification_idx").on(
      table.email_verification_token
    ),
    passwordResetIdx: index("customers_password_reset_idx").on(
      table.password_reset_token
    ),
  })
);

// Addresses table
export const addresses = pgTable(
  "addresses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customer_id: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }), // Made nullable for guest orders
    order_id: uuid("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }), // Link address to specific order
    type: text("type", { enum: ["billing", "shipping"] }).notNull(),
    name: text("name"), // Customer name for this address
    line1: text("line1").notNull(),
    line2: text("line2"),
    city: text("city").notNull(),
    region: text("region").notNull(),
    postal_code: text("postal_code").notNull(),
    country: text("country").notNull(),
    is_default: boolean("is_default").notNull().default(false),
    sort_order: integer("sort_order").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("addresses_customer_idx").on(table.customer_id),
    orderIdx: index("addresses_order_idx").on(table.order_id),
    typeIdx: index("addresses_type_idx").on(table.type),
    orderTypeIdx: index("addresses_order_type_idx").on(
      table.order_id,
      table.type
    ),
  })
);

// Carts table
export const carts = pgTable(
  "carts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customer_id: uuid("customer_id").references(() => customers.id, {
      onDelete: "cascade",
    }),
    currency: text("currency").notNull().default("USD"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("carts_customer_idx").on(table.customer_id),
  })
);

// Cart items table
export const cartItems = pgTable(
  "cart_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    cart_id: uuid("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unit_amount: decimal("unit_amount", { precision: 10, scale: 2 }).notNull(),
    selected_options: jsonb("selected_options"), // Store selected option values: { "crystal_type": "rose_quartz", "size": "medium" }
    descriptive_title: text("descriptive_title"), // Store descriptive title with selected options
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    cartIdx: index("cart_items_cart_idx").on(table.cart_id),
    productIdx: index("cart_items_product_idx").on(table.product_id),
  })
);

// Orders table
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customer_id: uuid("customer_id").references(() => customers.id), // Made nullable for guest orders
    guest_email: text("guest_email"), // Email for guest orders
    order_number: text("order_number").unique(), // Human-readable order number
    is_guest_order: boolean("is_guest_order").notNull().default(false),
    status: text("status", {
      enum: [
        "received",
        "paid",
        "shipped",
        "completed",
        "cancelled",
        "refunded",
      ],
    })
      .notNull()
      .default("received"),
    currency: text("currency").notNull().default("USD"),
    subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 10, scale: 2 }).notNull().default("0"),
    shipping: decimal("shipping", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    total: decimal("total", { precision: 10, scale: 2 }).notNull(),
    payment_intent_id: text("payment_intent_id"),
    tracking_number: text("tracking_number"), // Tracking number for shipped orders
    shipping_provider: text("shipping_provider", {
      enum: ["usps", "ups", "fedex", "other"],
    }), // Shipping provider
    shipped_at: timestamp("shipped_at"), // When the order was shipped
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    customerIdx: index("orders_customer_idx").on(table.customer_id),
    statusIdx: index("orders_status_idx").on(table.status),
    paymentIdx: index("orders_payment_idx").on(table.payment_intent_id),
    orderNumberIdx: index("orders_order_number_idx").on(table.order_number),
    guestLookupIdx: index("orders_guest_lookup_idx").on(
      table.order_number,
      table.guest_email
    ),
    trackingIdx: index("orders_tracking_idx").on(table.tracking_number),
    shippingProviderIdx: index("orders_shipping_provider_idx").on(
      table.shipping_provider
    ),
  })
);

// Order items table
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id),
    quantity: integer("quantity").notNull(),
    unit_amount: decimal("unit_amount", { precision: 10, scale: 2 }).notNull(),
    selected_options: jsonb("selected_options"), // Store selected option values: { "crystal_type": "rose_quartz", "size": "medium" }
    descriptive_title: text("descriptive_title"), // Store descriptive title with selected options
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    orderIdx: index("order_items_order_idx").on(table.order_id),
    productIdx: index("order_items_product_idx").on(table.product_id),
  })
);

// Promotions table
export const promotions = pgTable(
  "promotions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    type: text("type", {
      enum: ["percentage", "fixed_amount", "free_shipping"],
    }).notNull(),
    value: decimal("value", { precision: 10, scale: 2 }).notNull(),
    starts_at: timestamp("starts_at"),
    ends_at: timestamp("ends_at"),
    usage_limit: integer("usage_limit"),
    used: integer("used").notNull().default(0),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    codeIdx: index("promotions_code_idx").on(table.code),
    typeIdx: index("promotions_type_idx").on(table.type),
  })
);

// Stock notifications table
export const stockNotifications = pgTable(
  "stock_notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    is_notified: boolean("is_notified").notNull().default(false),
    notified_at: timestamp("notified_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("stock_notifications_product_idx").on(table.product_id),
    emailIdx: index("stock_notifications_email_idx").on(table.email),
    notifiedIdx: index("stock_notifications_notified_idx").on(
      table.is_notified
    ),
    // Composite index for finding unnotified subscriptions
    productNotifiedIdx: index("stock_notifications_product_notified_idx").on(
      table.product_id,
      table.is_notified
    ),
  })
);

// Product analytics table - tracks sales metrics per product
export const productAnalytics = pgTable(
  "product_analytics",
  {
    product_id: uuid("product_id")
      .primaryKey()
      .references(() => products.id, { onDelete: "cascade" }),
    total_sales: integer("total_sales").notNull().default(0), // Total number of units sold
    total_orders: integer("total_orders").notNull().default(0), // Total number of orders containing this product
    total_revenue: decimal("total_revenue", { precision: 10, scale: 2 })
      .notNull()
      .default("0"), // Total revenue generated
    views_count: integer("views_count").notNull().default(0), // Product page views
    last_sale_at: timestamp("last_sale_at"), // When the product was last sold
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    totalSalesIdx: index("product_analytics_total_sales_idx").on(
      table.total_sales
    ),
    totalRevenueIdx: index("product_analytics_total_revenue_idx").on(
      table.total_revenue
    ),
    lastSaleIdx: index("product_analytics_last_sale_idx").on(
      table.last_sale_at
    ),
  })
);

// Product purchase history - tracks individual purchases for detailed analytics
export const productPurchases = pgTable(
  "product_purchases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    product_id: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    order_id: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    customer_id: uuid("customer_id").references(() => customers.id, {
      onDelete: "set null",
    }), // Nullable for guest orders
    quantity: integer("quantity").notNull(),
    unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    total_price: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
    purchased_at: timestamp("purchased_at").notNull().defaultNow(),
  },
  (table) => ({
    productIdx: index("product_purchases_product_idx").on(table.product_id),
    orderIdx: index("product_purchases_order_idx").on(table.order_id),
    customerIdx: index("product_purchases_customer_idx").on(table.customer_id),
    purchasedAtIdx: index("product_purchases_purchased_at_idx").on(
      table.purchased_at
    ),
    // Composite index for product sales over time
    productTimeIdx: index("product_purchases_product_time_idx").on(
      table.product_id,
      table.purchased_at
    ),
  })
);

// Audit log table
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actor_id: uuid("actor_id"),
    actor_type: text("actor_type", {
      enum: ["customer", "admin", "system"],
    }).notNull(),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    meta: jsonb("meta"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    actorIdx: index("audit_log_actor_idx").on(table.actor_id),
    resourceIdx: index("audit_log_resource_idx").on(table.resource),
    createdIdx: index("audit_log_created_idx").on(table.created_at),
  })
);

// Relations
export const productsRelations = relations(products, ({ one, many }) => ({
  media: many(productMedia),
  options: many(productOptions),
  categories: many(productCategories),
  crystals: many(productCrystals),
  tags: many(productTags),
  prices: many(prices),
  inventory: many(inventory),
  cartItems: many(cartItems),
  orderItems: many(orderItems),
  stockNotifications: many(stockNotifications),
  analytics: one(productAnalytics, {
    fields: [products.id],
    references: [productAnalytics.product_id],
  }),
  purchases: many(productPurchases),
}));

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, {
    fields: [productMedia.product_id],
    references: [products.id],
  }),
}));

export const productOptionsRelations = relations(
  productOptions,
  ({ one, many }) => ({
    product: one(products, {
      fields: [productOptions.product_id],
      references: [products.id],
    }),
    values: many(productOptionValues),
  })
);

export const productOptionValuesRelations = relations(
  productOptionValues,
  ({ one }) => ({
    option: one(productOptions, {
      fields: [productOptionValues.option_id],
      references: [productOptions.id],
    }),
  })
);

export const pricesRelations = relations(prices, ({ one }) => ({
  product: one(products, {
    fields: [prices.product_id],
    references: [products.id],
  }),
}));

export const inventoryRelations = relations(inventory, ({ one }) => ({
  product: one(products, {
    fields: [inventory.product_id],
    references: [products.id],
  }),
}));

export const productCrystalsRelations = relations(
  productCrystals,
  ({ one }) => ({
    product: one(products, {
      fields: [productCrystals.product_id],
      references: [products.id],
    }),
  })
);

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  parent: one(categories, {
    fields: [categories.parent_id],
    references: [categories.id],
  }),
  children: many(categories),
  products: many(productCategories),
}));

export const productCategoriesRelations = relations(
  productCategories,
  ({ one }) => ({
    product: one(products, {
      fields: [productCategories.product_id],
      references: [products.id],
    }),
    category: one(categories, {
      fields: [productCategories.category_id],
      references: [categories.id],
    }),
  })
);

export const tagsRelations = relations(tags, ({ many }) => ({
  products: many(productTags),
}));

export const productTagsRelations = relations(productTags, ({ one }) => ({
  product: one(products, {
    fields: [productTags.product_id],
    references: [products.id],
  }),
  tag: one(tags, {
    fields: [productTags.tag_id],
    references: [tags.id],
  }),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  addresses: many(addresses),
  carts: many(carts),
  orders: many(orders),
}));

export const addressesRelations = relations(addresses, ({ one }) => ({
  customer: one(customers, {
    fields: [addresses.customer_id],
    references: [customers.id],
  }),
}));

export const cartsRelations = relations(carts, ({ one, many }) => ({
  customer: one(customers, {
    fields: [carts.customer_id],
    references: [customers.id],
  }),
  items: many(cartItems),
}));

export const cartItemsRelations = relations(cartItems, ({ one }) => ({
  cart: one(carts, {
    fields: [cartItems.cart_id],
    references: [carts.id],
  }),
  product: one(products, {
    fields: [cartItems.product_id],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(customers, {
    fields: [orders.customer_id],
    references: [customers.id],
  }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.order_id],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.product_id],
    references: [products.id],
  }),
}));

export const stockNotificationsRelations = relations(
  stockNotifications,
  ({ one }) => ({
    product: one(products, {
      fields: [stockNotifications.product_id],
      references: [products.id],
    }),
  })
);

export const productAnalyticsRelations = relations(
  productAnalytics,
  ({ one }) => ({
    product: one(products, {
      fields: [productAnalytics.product_id],
      references: [products.id],
    }),
  })
);

export const productPurchasesRelations = relations(
  productPurchases,
  ({ one }) => ({
    product: one(products, {
      fields: [productPurchases.product_id],
      references: [products.id],
    }),
    order: one(orders, {
      fields: [productPurchases.order_id],
      references: [orders.id],
    }),
    customer: one(customers, {
      fields: [productPurchases.customer_id],
      references: [customers.id],
    }),
  })
);
