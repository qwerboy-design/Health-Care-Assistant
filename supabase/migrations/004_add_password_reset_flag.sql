-- Add requires_password_reset column to customers table
ALTER TABLE IF EXISTS customers 
ADD COLUMN IF NOT EXISTS requires_password_reset BOOLEAN DEFAULT FALSE;
