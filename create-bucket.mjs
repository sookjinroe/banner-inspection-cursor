import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing!');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}
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
