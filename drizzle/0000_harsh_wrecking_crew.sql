CREATE TYPE "public"."category_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TYPE "public"."loan_type" AS ENUM('borrowed', 'lent');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "misi_category" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" "category_type" NOT NULL,
	"color" varchar(255) NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_loan_payment" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"loan_id" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"principal_amount" numeric(12, 2) NOT NULL,
	"interest_amount" numeric(12, 2) NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"revenue_stream" varchar(255),
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_loan" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" "loan_type" NOT NULL,
	"name" varchar(255) NOT NULL,
	"principal_amount" numeric(12, 2) NOT NULL,
	"current_balance" numeric(12, 2) NOT NULL,
	"interest_rate" numeric(5, 2) NOT NULL,
	"term_months" integer NOT NULL,
	"monthly_payment" numeric(12, 2) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"next_payment_date" timestamp with time zone NOT NULL,
	"revenue_stream_allocation" varchar(255),
	"category_name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_transaction_template" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category_name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"revenue_stream" varchar(255),
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "misi_transaction" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"category_name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"date" timestamp with time zone NOT NULL,
	"revenue_stream" varchar(255),
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE INDEX "category_name_idx" ON "misi_category" USING btree ("name");--> statement-breakpoint
CREATE INDEX "category_type_idx" ON "misi_category" USING btree ("type");--> statement-breakpoint
CREATE UNIQUE INDEX "category_name_type_unique" ON "misi_category" USING btree ("name","type");--> statement-breakpoint
CREATE INDEX "loan_payment_loan_id_idx" ON "misi_loan_payment" USING btree ("loan_id");--> statement-breakpoint
CREATE INDEX "loan_payment_date_idx" ON "misi_loan_payment" USING btree ("date");--> statement-breakpoint
CREATE INDEX "loan_payment_revenue_stream_idx" ON "misi_loan_payment" USING btree ("revenue_stream");--> statement-breakpoint
CREATE INDEX "loan_type_idx" ON "misi_loan" USING btree ("type");--> statement-breakpoint
CREATE INDEX "loan_next_payment_idx" ON "misi_loan" USING btree ("next_payment_date");--> statement-breakpoint
CREATE INDEX "loan_revenue_stream_idx" ON "misi_loan" USING btree ("revenue_stream_allocation");--> statement-breakpoint
CREATE INDEX "loan_category_idx" ON "misi_loan" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "template_type_idx" ON "misi_transaction_template" USING btree ("type");--> statement-breakpoint
CREATE INDEX "template_category_idx" ON "misi_transaction_template" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "transaction_type_idx" ON "misi_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "transaction_date_idx" ON "misi_transaction" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transaction_category_idx" ON "misi_transaction" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "transaction_revenue_stream_idx" ON "misi_transaction" USING btree ("revenue_stream");