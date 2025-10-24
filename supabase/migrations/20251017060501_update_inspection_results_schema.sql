/*
  # Update Inspection Results Schema

  1. Changes to inspection_results table
    - Modify guideline_checks jsonb structure to support new format with:
      - category (text)
      - itemCode (text) 
      - description (text)
      - status (text: '준수', '위반', '부분 준수', '정보')
      - comment (text)
    - Keep existing columns: id, banner_id, ai_feedback, inspected_at
  
  2. New system_config table
    - Create table for storing system configuration
    - Store approved_icons_image_url for icon list image path
    - Enable RLS with public access
  
  3. Security
    - Maintain existing RLS policies on inspection_results
    - Add RLS policies for system_config table
*/

-- Create system_config table for storing approved icon list and other system settings
CREATE TABLE IF NOT EXISTS system_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key text UNIQUE NOT NULL,
  config_value text NOT NULL,
  description text,
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on system_config
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access to system_config
CREATE POLICY "Allow public read access to system_config"
  ON system_config FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to system_config"
  ON system_config FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to system_config"
  ON system_config FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from system_config"
  ON system_config FOR DELETE
  TO anon, authenticated
  USING (true);

-- Insert default approved icons image URL (placeholder - will be updated with actual path)
INSERT INTO system_config (config_key, config_value, description)
VALUES (
  'approved_icons_image_url',
  'system-assets/approved-icons.png',
  'Path to the approved icon list image used for banner inspection'
)
ON CONFLICT (config_key) DO NOTHING;

-- Create index on config_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- Note: The inspection_results.guideline_checks column is already JSONB
-- and flexible enough to store the new format with category, itemCode, description, status, comment
-- No schema changes needed for that column