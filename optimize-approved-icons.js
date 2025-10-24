import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function optimizeAndUploadIcons() {
  try {
    console.log('Reading approved icons image file...');
    const imageBuffer = readFileSync('./public/Value Prop icon.jpg.jpeg');
    const originalSize = imageBuffer.length;
    console.log(`Original file size: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    // For now, we'll upload the original and provide instructions to optimize
    // In production, you'd use a library like sharp to resize/compress
    console.log('\n⚠️  WARNING: Image is too large (6.86MB)');
    console.log('OpenAI Vision API may timeout downloading images > 5MB');
    console.log('\nRecommendations:');
    console.log('1. Resize image to max 2000x2000 pixels');
    console.log('2. Reduce JPEG quality to 80-85%');
    console.log('3. Target file size: < 2MB');
    console.log('\nYou can use tools like:');
    console.log('- ImageMagick: convert input.jpg -resize 2000x2000 -quality 85 output.jpg');
    console.log('- Online: tinypng.com, squoosh.app');

    // Check if file exists and upload
    console.log('\nUploading image to Supabase storage...');
    const imagePath = 'system-assets/approved-icons.jpeg';

    const { error: uploadError } = await supabase.storage
      .from('banner-assets')
      .upload(imagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.log(`Upload result: ${uploadError.message}`);
    } else {
      console.log(`Successfully uploaded to: ${imagePath}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('banner-assets')
      .getPublicUrl(imagePath);

    console.log(`\nPublic URL: ${urlData.publicUrl}`);
    console.log('\nTesting URL accessibility...');

    const response = await fetch(urlData.publicUrl, { method: 'HEAD' });
    console.log(`URL is accessible: ${response.ok}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`Content-Length: ${response.headers.get('content-length')} bytes`);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

optimizeAndUploadIcons();
