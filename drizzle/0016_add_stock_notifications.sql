--> statement-breakpoint
CREATE TABLE "stock_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"email" text NOT NULL,
	"is_notified" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "stock_notifications_product_idx" ON "stock_notifications" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "stock_notifications_email_idx" ON "stock_notifications" USING btree ("email");--> statement-breakpoint
CREATE INDEX "stock_notifications_notified_idx" ON "stock_notifications" USING btree ("is_notified");--> statement-breakpoint
CREATE INDEX "stock_notifications_product_notified_idx" ON "stock_notifications" USING btree ("product_id","is_notified");--> statement-breakpoint
ALTER TABLE "stock_notifications" ADD CONSTRAINT "stock_notifications_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
