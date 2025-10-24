/*
  # Create Storage Bucket for Banner Assets

  1. New Storage Bucket
    - `banner-assets` bucket for storing CSS files and banner images
    - Public access enabled for easy retrieval
  
  2. Storage Policies
    - Allow public read access to all files
    - Allow authenticated users to upload files
    - Allow authenticated users to update/delete their files
  
  3. Security
    - RLS enabled on storage.objects
    - Public can read all files in banner-assets bucket
    - Only authenticated users can upload/modify files
*/

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'banner-assets',
  'banner-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['text/css', 'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for banner assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload banner assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update banner assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete banner assets" ON storage.objects;

-- Create policy for public read access
CREATE POLICY "Public read access for banner assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'banner-assets');

-- Create policy for authenticated users to upload
CREATE POLICY "Authenticated users can upload banner assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banner-assets');

-- Create policy for authenticated users to update
CREATE POLICY "Authenticated users can update banner assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'banner-assets')
WITH CHECK (bucket_id = 'banner-assets');

-- Create policy for authenticated users to delete
CREATE POLICY "Authenticated users can delete banner assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'banner-assets');
