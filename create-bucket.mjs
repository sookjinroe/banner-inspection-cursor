import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://mfotyqmhbzmxhhmfojjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R5cW1oYnpteGhobWZvampkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDI3MzMsImV4cCI6MjA3NjExODczM30.Meg1IEN1j3jtjHzJ8FdkQnkrkH-1HFrQldCkWKsFDE0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('banner-images', {
    public: true,
    fileSizeLimit: 10485760 // 10MB
  });

  if (error) {
    console.log('Bucket creation error (might already exist):', error.message);
  } else {
    console.log('Bucket created:', data);
  }
  
  // List existing buckets
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error('Error listing buckets:', listError);
  } else {
    console.log('Existing buckets:', buckets.map(b => b.name));
  }
}

createBucket();
