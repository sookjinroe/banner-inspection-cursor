-- Banner Collection System Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Create countries table
CREATE TABLE IF NOT EXISTS countries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create collection_results table
CREATE TABLE IF NOT EXISTS collection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id uuid REFERENCES countries(id) ON DELETE SET NULL,
  country_name text,
  country_url text NOT NULL,
  status text NOT NULL DEFAULT 'idle',
  inspection_status text NOT NULL DEFAULT 'not_inspected',
  banner_count integer DEFAULT 0,
  passed_count integer,
  error_message text,
  collected_at timestamptz DEFAULT now()
);

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_result_id uuid NOT NULL REFERENCES collection_results(id) ON DELETE CASCADE,
  title text NOT NULL,
  banner_type text NOT NULL DEFAULT 'web',
  html_code text NOT NULL,
  css_code text NOT NULL,
  image_urls text[] DEFAULT '{}',
  screenshot_url text,
  extracted_at timestamptz DEFAULT now()
);

-- Create inspection_results table
CREATE TABLE IF NOT EXISTS inspection_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  banner_id uuid NOT NULL REFERENCES banners(id) ON DELETE CASCADE,
  guideline_checks jsonb NOT NULL DEFAULT '[]',
  ai_feedback text NOT NULL,
  inspected_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;

-- Create policies for public access
CREATE POLICY "Allow public read access to countries"
  ON countries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to countries"
  ON countries FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to countries"
  ON countries FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete from countries"
  ON countries FOR DELETE
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public read access to collection_results"
  ON collection_results FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to collection_results"
  ON collection_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to collection_results"
  ON collection_results FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to banners"
  ON banners FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to banners"
  ON banners FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to banners"
  ON banners FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public read access to inspection_results"
  ON inspection_results FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow public insert to inspection_results"
  ON inspection_results FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow public update to inspection_results"
  ON inspection_results FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_collection_results_country_id ON collection_results(country_id);
CREATE INDEX IF NOT EXISTS idx_banners_collection_result_id ON banners(collection_result_id);
CREATE INDEX IF NOT EXISTS idx_inspection_results_banner_id ON inspection_results(banner_id);
CREATE INDEX IF NOT EXISTS idx_collection_results_collected_at ON collection_results(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_countries_created_at ON countries(created_at DESC);
