-- Add login lockout tracking fields to users
ALTER TABLE "master"."users"
  ADD COLUMN "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locked_until" TIMESTAMPTZ(6);
