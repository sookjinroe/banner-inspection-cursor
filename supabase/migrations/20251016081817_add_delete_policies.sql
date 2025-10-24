/*
  # Add Delete Policies

  1. Changes
    - Add DELETE policy for collection_results table
    - Add DELETE policy for inspection_results table
  
  2. Security
    - Allow public delete operations on collection_results
    - Allow public delete operations on inspection_results
    - Banners will be cascade deleted automatically via foreign key constraint
*/

-- Add delete policy for collection_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'collection_results' 
    AND policyname = 'Allow public delete from collection_results'
  ) THEN
    CREATE POLICY "Allow public delete from collection_results"
      ON collection_results FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Add delete policy for inspection_results
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inspection_results' 
    AND policyname = 'Allow public delete from inspection_results'
  ) THEN
    CREATE POLICY "Allow public delete from inspection_results"
      ON inspection_results FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- Add delete policy for banners
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'banners' 
    AND policyname = 'Allow public delete from banners'
  ) THEN
    CREATE POLICY "Allow public delete from banners"
      ON banners FOR DELETE
      TO anon, authenticated
      USING (true);
  END IF;
END $$;
