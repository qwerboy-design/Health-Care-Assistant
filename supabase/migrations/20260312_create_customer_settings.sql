-- Create customer_settings table
CREATE TABLE IF NOT EXISTS customer_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL UNIQUE,
  show_function_selector BOOLEAN NOT NULL DEFAULT false,
  show_workload_selector BOOLEAN NOT NULL DEFAULT false,
  show_screenshot BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Foreign key constraint
  CONSTRAINT fk_customer
    FOREIGN KEY (customer_id)
    REFERENCES customers(id)
    ON DELETE CASCADE
);

-- Create index on customer_id for faster lookups
CREATE INDEX idx_customer_settings_customer_id ON customer_settings(customer_id);

-- Create trigger function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_customer_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_update_customer_settings_updated_at
  BEFORE UPDATE ON customer_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_settings_updated_at();

-- Add comment for documentation
COMMENT ON TABLE customer_settings IS 'Stores customer UI customization settings for showing/hiding features';
COMMENT ON COLUMN customer_settings.show_function_selector IS 'Whether to show the function selector component';
COMMENT ON COLUMN customer_settings.show_workload_selector IS 'Whether to show the workload level selector';
COMMENT ON COLUMN customer_settings.show_screenshot IS 'Whether to show the screenshot feature';
