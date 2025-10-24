/*
  # Fix Storage Bucket Anonymous Access

  1. Problem
    - Storage policies were restricting uploads to authenticated users only
    - Application uses anonymous (anon) key for all operations
    - This caused "new row violates row-level security policy" errors
  
  2. Solution
    - Update storage policies to allow anonymous users
    - Match the access pattern used for database tables
    - Maintain public read access
  
  3. Changes
    - Drop existing restrictive INSERT, UPDATE, DELETE policies
    - Recreate policies with `TO anon, authenticated` instead of just `TO authenticated`
    - Keep public read access policy unchanged
  
  4. Security Notes
    - Anonymous access is intentional for this application
    - Bucket already has MIME type restrictions (CSS, images only)
    - File size limit of 50MB is enforced at bucket level
*/

-- Drop existing policies that restrict to authenticated only
DROP POLICY IF EXISTS "Authenticated users can upload banner assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update banner assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete banner assets" ON storage.objects;

-- Recreate policies to allow anonymous users
CREATE POLICY "Allow anonymous and authenticated users to upload banner assets"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'banner-assets');

CREATE POLICY "Allow anonymous and authenticated users to update banner assets"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'banner-assets')
WITH CHECK (bucket_id = 'banner-assets');

CREATE POLICY "Allow anonymous and authenticated users to delete banner assets"
ON storage.objects
FOR DELETE
TO anon, authenticated
USING (bucket_id = 'banner-assets');