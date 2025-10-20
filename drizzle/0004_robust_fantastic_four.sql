ALTER TABLE "customers" ADD COLUMN "email_verification_token" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "email_verification_expires" timestamp;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "password_reset_token" text;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "password_reset_expires" timestamp;--> statement-breakpoint
CREATE INDEX "customers_email_verification_idx" ON "customers" USING btree ("email_verification_token");--> statement-breakpoint
CREATE INDEX "customers_password_reset_idx" ON "customers" USING btree ("password_reset_token");