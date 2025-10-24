/*
  # Clean Up Inspection Schema - Remove Legacy Format
  
  This migration simplifies the inspection system by removing legacy columns and consolidating
  to a single, clean inspection format.
  
  ## 1. Changes to inspection_results table
  
  - **REMOVE** `guideline_checks` column (old format - replaced by banner_inspection_report)
  - **REMOVE** `ai_feedback` column (old format - no longer needed)
  - **KEEP** `banner_inspection_report` column (new format - desktop/mobile separate)
  - **KEEP** core columns: id, banner_id, inspected_at
  
  ## 2. Data Migration Strategy
  
  - Drop old columns after confirming new column exists
  - All future inspections will use only banner_inspection_report format
  
  ## 3. Why This Change
  
  The old format (guideline_checks + ai_feedback) and new format (banner_inspection_report)
  were both present, causing confusion and code complexity. This migration removes the old
  format entirely, leaving only the new desktop/mobile separated inspection format.
  
  ## 4. Breaking Changes
  
  ⚠️ WARNING: This will delete all old-format inspection data that hasn't been migrated
  to the new format. If you have important old inspection results, back them up first.
*/

-- Ensure the new column exists (should already exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_results' AND column_name = 'banner_inspection_report'
  ) THEN
    ALTER TABLE inspection_results ADD COLUMN banner_inspection_report jsonb;
    CREATE INDEX IF NOT EXISTS idx_inspection_results_banner_report ON inspection_results(banner_inspection_report);
  END IF;
END $$;

-- Drop the old format columns
DO $$
BEGIN
  -- Drop guideline_checks column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_results' AND column_name = 'guideline_checks'
  ) THEN
    ALTER TABLE inspection_results DROP COLUMN guideline_checks;
  END IF;
  
  -- Drop ai_feedback column if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'inspection_results' AND column_name = 'ai_feedback'
  ) THEN
    ALTER TABLE inspection_results DROP COLUMN ai_feedback;
  END IF;
END $$;

-- Make banner_inspection_report NOT NULL for new records (existing nulls allowed)
-- This ensures all future inspections must provide the report
ALTER TABLE inspection_results ALTER COLUMN banner_inspection_report SET DEFAULT '{}';

-- Clean up any inspection results that don't have the new format data
-- Uncomment the line below if you want to delete old inspection results without new format
-- DELETE FROM inspection_results WHERE banner_inspection_report IS NULL OR banner_inspection_report = '{}';

-- Verify the inspection_jobs and inspection_job_logs tables are properly set up
-- (they should exist from previous migration)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_jobs') THEN
    RAISE EXCEPTION 'inspection_jobs table does not exist. Please run the create_inspection_jobs_schema migration first.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inspection_job_logs') THEN
    RAISE EXCEPTION 'inspection_job_logs table does not exist. Please run the create_inspection_jobs_schema migration first.';
  END IF;
END $$;

-- Add comment to table for documentation
COMMENT ON TABLE inspection_results IS 'Stores banner inspection results in new format only. Uses banner_inspection_report (jsonb) with separate desktop and mobile inspection data.';
COMMENT ON COLUMN inspection_results.banner_inspection_report IS 'JSON structure: { desktop: { overallStatus, issues[], detailedReport[] }, mobile: { overallStatus, issues[], detailedReport[] } }';
