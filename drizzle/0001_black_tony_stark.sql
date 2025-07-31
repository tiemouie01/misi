CREATE TYPE "public"."activity_type" AS ENUM('login', 'logout', 'transaction_created', 'transaction_updated', 'transaction_deleted', 'category_created', 'category_updated', 'category_deleted', 'loan_created', 'loan_updated', 'loan_deleted', 'loan_payment_created', 'template_created', 'template_deleted', 'profile_updated');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'user');--> statement-breakpoint
CREATE TABLE "misi_activity_log" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"activity_type" varchar(255) NOT NULL,
	"entity_type" varchar(255),
	"entity_id" varchar(255),
	"description" text NOT NULL,
	"metadata" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "misi_system_setting" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_usage_statistic" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"date" date NOT NULL,
	"active_users" integer DEFAULT 0 NOT NULL,
	"new_users" integer DEFAULT 0 NOT NULL,
	"total_logins" integer DEFAULT 0 NOT NULL,
	"transactions_created" integer DEFAULT 0 NOT NULL,
	"loans_created" integer DEFAULT 0 NOT NULL,
	"categories_created" integer DEFAULT 0 NOT NULL,
	"templates_created" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_expenses" numeric(12, 2) DEFAULT '0' NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_user_session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"session_token" varchar(255) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"last_login_at" timestamp with time zone,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
DROP INDEX "category_name_type_unique";--> statement-breakpoint
ALTER TABLE "misi_category" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "misi_loan_payment" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "misi_loan" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "misi_transaction_template" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "misi_transaction" ADD COLUMN "user_id" varchar(255) NOT NULL;--> statement-breakpoint
CREATE INDEX "activity_user_id_idx" ON "misi_activity_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "activity_type_idx" ON "misi_activity_log" USING btree ("activity_type");--> statement-breakpoint
CREATE INDEX "activity_entity_idx" ON "misi_activity_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "activity_created_idx" ON "misi_activity_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "activity_user_date_idx" ON "misi_activity_log" USING btree ("user_id","createdAt");--> statement-breakpoint
CREATE UNIQUE INDEX "setting_key_unique" ON "misi_system_setting" USING btree ("key");--> statement-breakpoint
CREATE INDEX "setting_key_idx" ON "misi_system_setting" USING btree ("key");--> statement-breakpoint
CREATE INDEX "setting_public_idx" ON "misi_system_setting" USING btree ("is_public");--> statement-breakpoint
CREATE UNIQUE INDEX "usage_date_unique" ON "misi_usage_statistic" USING btree ("date");--> statement-breakpoint
CREATE INDEX "usage_date_idx" ON "misi_usage_statistic" USING btree ("date");--> statement-breakpoint
CREATE INDEX "usage_active_users_idx" ON "misi_usage_statistic" USING btree ("active_users");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "misi_user_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_token_idx" ON "misi_user_session" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "session_expires_idx" ON "misi_user_session" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "user_email_unique" ON "misi_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "misi_user" USING btree ("email");--> statement-breakpoint
CREATE INDEX "user_role_idx" ON "misi_user" USING btree ("role");--> statement-breakpoint
CREATE INDEX "category_user_id_idx" ON "misi_category" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_name_type_user_unique" ON "misi_category" USING btree ("name","type","user_id");--> statement-breakpoint
CREATE INDEX "loan_payment_user_id_idx" ON "misi_loan_payment" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loan_payment_user_date_idx" ON "misi_loan_payment" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "loan_user_id_idx" ON "misi_loan" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "loan_user_payment_date_idx" ON "misi_loan" USING btree ("user_id","next_payment_date");--> statement-breakpoint
CREATE INDEX "template_user_id_idx" ON "misi_transaction_template" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_user_id_idx" ON "misi_transaction" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "transaction_user_date_idx" ON "misi_transaction" USING btree ("user_id","date");