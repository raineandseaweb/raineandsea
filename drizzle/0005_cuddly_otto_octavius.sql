ALTER TABLE "customers" ADD COLUMN "role" text DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "base_price" numeric(10, 2);--> statement-breakpoint
CREATE INDEX "customers_role_idx" ON "customers" USING btree ("role");