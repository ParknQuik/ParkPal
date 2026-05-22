-- Add missing google_id column to users table
ALTER TABLE "users" ADD COLUMN "google_id" TEXT UNIQUE;