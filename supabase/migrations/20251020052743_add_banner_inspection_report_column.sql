/*
  # Add banner_inspection_report column to inspection_results

  1. Changes
    - Add `banner_inspection_report` (jsonb, nullable) column to store new format inspection results
    - This column stores desktop and mobile inspection reports separately
  
  2. Notes
    - Existing `guideline_checks` column remains for backward compatibility
    - New inspections will use `banner_inspection_report` format
*/

-- Add banner_inspection_report column to inspection_results table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_results' AND column_name = 'banner_inspection_report'
  ) THEN
    ALTER TABLE inspection_results ADD COLUMN banner_inspection_report jsonb;
  END IF;
END $$;

-- Create index for faster queries on this column
CREATE INDEX IF NOT EXISTS idx_inspection_results_banner_report ON inspection_results(banner_inspection_report);
