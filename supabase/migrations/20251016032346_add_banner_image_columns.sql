/*
  # Add Responsive Image Columns to Banners Table

  1. Changes
    - Add `image_desktop` column to store desktop version image URL
    - Add `image_mobile` column to store mobile version image URL
  
  2. Notes
    - These columns store the separate desktop and mobile image URLs from parsed banner data
    - Allows for proper responsive image display with desktop/mobile toggle
    - Existing banners will have NULL values, new banners will populate these fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banners' AND column_name = 'image_desktop'
  ) THEN
    ALTER TABLE banners ADD COLUMN image_desktop text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'banners' AND column_name = 'image_mobile'
  ) THEN
    ALTER TABLE banners ADD COLUMN image_mobile text;
  END IF;
END $$;
