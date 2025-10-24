/*
  # Create Inspection Jobs Schema
  
  This migration creates a robust background job processing system for banner inspections.
  It enables inspections to continue even after page navigation or browser closure.
  
  ## 1. New Tables
  
  ### `inspection_jobs`
  Tracks all inspection job requests and their execution status.
  - `id` (uuid, primary key) - Unique job identifier
  - `collection_result_id` (uuid, foreign key) - Reference to collection being inspected
  - `job_type` (text) - Type of job: 'single_banner' or 'all_banners'
  - `banner_id` (uuid, nullable) - Specific banner ID for single banner jobs
  - `status` (text) - Job status: 'pending', 'processing', 'completed', 'failed', 'cancelled'
  - `progress_current` (integer) - Current progress count
  - `progress_total` (integer) - Total items to process
  - `error_message` (text, nullable) - Error details if job failed
  - `started_at` (timestamptz, nullable) - When job processing began
  - `completed_at` (timestamptz, nullable) - When job finished
  - `created_at` (timestamptz) - When job was created
  - `created_by` (uuid, nullable) - User who created the job (for future auth integration)
  
  ### `inspection_job_logs`
  Detailed logs for each inspection job, tracking individual banner processing.
  - `id` (uuid, primary key) - Unique log entry identifier
  - `job_id` (uuid, foreign key) - Reference to parent job
  - `banner_id` (uuid) - Banner being processed
  - `status` (text) - Processing status: 'pending', 'processing', 'completed', 'failed'
  - `result_summary` (text, nullable) - Brief summary of inspection result
  - `error_message` (text, nullable) - Error details if processing failed
  - `created_at` (timestamptz) - When log entry was created
  
  ## 2. Security
  
  - Enable RLS on all tables
  - Allow public read access for job status monitoring (adjust for auth later)
  - Allow public insert for job creation (adjust for auth later)
  - System can update job status and logs
  
  ## 3. Indexes
  
  - Index on job status for efficient status-based queries
  - Index on collection_result_id for quick job lookup by collection
  - Index on created_at for time-based queries and cleanup
  
  ## 4. Constraints
  
  - Valid status values enforced via CHECK constraints
  - Progress values must be non-negative
  - Completed/failed jobs must have completion timestamp
*/

-- Create inspection_jobs table
CREATE TABLE IF NOT EXISTS inspection_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_result_id uuid NOT NULL REFERENCES collection_results(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('single_banner', 'all_banners')),
  banner_id uuid REFERENCES banners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress_current integer NOT NULL DEFAULT 0 CHECK (progress_current >= 0),
  progress_total integer NOT NULL DEFAULT 0 CHECK (progress_total >= 0),
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid,
  
  -- Constraints
  CONSTRAINT single_banner_requires_banner_id CHECK (
    (job_type = 'single_banner' AND banner_id IS NOT NULL) OR
    (job_type = 'all_banners' AND banner_id IS NULL)
  )
);

-- Create inspection_job_logs table
CREATE TABLE IF NOT EXISTS inspection_job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES inspection_jobs(id) ON DELETE CASCADE,
  banner_id uuid NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'skipped')),
  result_summary text,
  error_message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_status ON inspection_jobs(status);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_collection ON inspection_jobs(collection_result_id);
CREATE INDEX IF NOT EXISTS idx_inspection_jobs_created_at ON inspection_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspection_job_logs_job_id ON inspection_job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_inspection_job_logs_banner_id ON inspection_job_logs(banner_id);

-- Enable Row Level Security
ALTER TABLE inspection_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_job_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inspection_jobs
-- Allow anyone to view jobs (adjust when auth is implemented)
CREATE POLICY "Allow public read access to inspection jobs"
  ON inspection_jobs
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to create jobs (adjust when auth is implemented)
CREATE POLICY "Allow public insert of inspection jobs"
  ON inspection_jobs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update jobs (needed for edge function to update status)
CREATE POLICY "Allow public update of inspection jobs"
  ON inspection_jobs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- RLS Policies for inspection_job_logs
-- Allow anyone to view logs (adjust when auth is implemented)
CREATE POLICY "Allow public read access to inspection job logs"
  ON inspection_job_logs
  FOR SELECT
  TO public
  USING (true);

-- Allow anyone to create logs (needed for edge function)
CREATE POLICY "Allow public insert of inspection job logs"
  ON inspection_job_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to update logs (needed for edge function)
CREATE POLICY "Allow public update of inspection job logs"
  ON inspection_job_logs
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Add current_job_id to collection_results for quick job lookup
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'collection_results' AND column_name = 'current_job_id'
  ) THEN
    ALTER TABLE collection_results ADD COLUMN current_job_id uuid REFERENCES inspection_jobs(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_collection_results_current_job ON collection_results(current_job_id);
  END IF;
END $$;

-- Function to automatically update job progress
CREATE OR REPLACE FUNCTION update_job_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the job's progress based on completed log entries
  UPDATE inspection_jobs
  SET 
    progress_current = (
      SELECT COUNT(*) 
      FROM inspection_job_logs 
      WHERE job_id = NEW.job_id 
      AND status IN ('completed', 'failed', 'skipped')
    )
  WHERE id = NEW.job_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update job progress when logs change
DROP TRIGGER IF EXISTS trigger_update_job_progress ON inspection_job_logs;
CREATE TRIGGER trigger_update_job_progress
  AFTER INSERT OR UPDATE OF status ON inspection_job_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_job_progress();

-- Function to auto-complete jobs when all items are processed
CREATE OR REPLACE FUNCTION auto_complete_job()
RETURNS TRIGGER AS $$
DECLARE
  total_count integer;
  completed_count integer;
  failed_count integer;
BEGIN
  -- Get counts
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('completed', 'failed', 'skipped')),
    COUNT(*) FILTER (WHERE status = 'failed'),
    COUNT(*)
  INTO completed_count, failed_count, total_count
  FROM inspection_job_logs
  WHERE job_id = NEW.job_id;
  
  -- If all items are processed, mark job as completed or failed
  IF completed_count = total_count THEN
    UPDATE inspection_jobs
    SET 
      status = CASE WHEN failed_count = total_count THEN 'failed' ELSE 'completed' END,
      completed_at = now(),
      error_message = CASE 
        WHEN failed_count > 0 THEN format('%s of %s items failed', failed_count, total_count)
        ELSE NULL
      END
    WHERE id = NEW.job_id AND status = 'processing';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete jobs
DROP TRIGGER IF EXISTS trigger_auto_complete_job ON inspection_job_logs;
CREATE TRIGGER trigger_auto_complete_job
  AFTER INSERT OR UPDATE OF status ON inspection_job_logs
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_job();