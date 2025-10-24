-- Clean up inspection_results table schema
-- Remove legacy ai_feedback column that's causing NOT NULL constraint errors

-- First, make ai_feedback nullable to avoid constraint errors
ALTER TABLE inspection_results ALTER COLUMN ai_feedback DROP NOT NULL;

-- Then drop the column entirely (as planned in cleanup migration)
ALTER TABLE inspection_results DROP COLUMN IF EXISTS ai_feedback;

-- Also drop guideline_checks if it exists
ALTER TABLE inspection_results DROP COLUMN IF EXISTS guideline_checks;

-- Ensure banner_inspection_report is properly set up
ALTER TABLE inspection_results ALTER COLUMN banner_inspection_report SET NOT NULL;

-- Add comment for clarity
COMMENT ON TABLE inspection_results IS 'Stores banner inspection results using banner_inspection_report (jsonb) format only.';
COMMENT ON COLUMN inspection_results.banner_inspection_report IS 'JSON structure: { desktop: { overallStatus, issues[], detailedReport[] }, mobile: { overallStatus, issues[], detailedReport[] } }';
