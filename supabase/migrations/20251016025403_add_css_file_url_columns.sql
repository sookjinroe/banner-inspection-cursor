/*
  # Add CSS File URL Storage Support

  1. Changes to `collection_results` table
    - Add `css_file_url` column to store the Supabase Storage path for the shared CSS file
    - This CSS file will be used by all banners in the collection

  2. Changes to `banners` table
    - Make `css_code` column nullable to support Storage-based CSS loading
    - Add default empty string for backward compatibility
    - The `screenshot_url` column already exists and will store the screenshot image path

  3. Storage Structure
    - CSS files: collections/{collection_result_id}/styles.css
    - Screenshots: banners/{collection_result_id}/{banner_id}.png
    - Both stored in the `banner-images` bucket

  4. Important Notes
    - This migration prepares the schema for CSS Storage migration
    - Existing data will not be affected (css_code remains functional)
    - New collections will store CSS in Storage and reference via css_file_url
    - Screenshots will be generated after CSS is uploaded and banners are rendered
*/

-- Add css_file_url to collection_results table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_results' AND column_name = 'css_file_url'
  ) THEN
    ALTER TABLE collection_results ADD COLUMN css_file_url text;
  END IF;
END $$;

-- Make css_code nullable and add default empty string for banners table
DO $$
BEGIN
  -- Check if the column exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banners' 
    AND column_name = 'css_code' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE banners ALTER COLUMN css_code DROP NOT NULL;
    ALTER TABLE banners ALTER COLUMN css_code SET DEFAULT '';
  END IF;
END $$;

-- Add comment to css_file_url column
COMMENT ON COLUMN collection_results.css_file_url IS 'Supabase Storage path to the CSS file (e.g., collections/{id}/styles.css)';
COMMENT ON COLUMN banners.screenshot_url IS 'Supabase Storage path to the banner screenshot (e.g., banners/{collection_id}/{banner_id}.png)';
