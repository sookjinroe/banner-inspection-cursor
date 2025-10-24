import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadApprovedIcons() {
  try {
    console.log('Reading approved icons image file...');
    const imageBuffer = readFileSync('./public/Value Prop icon.jpg.jpeg');

    console.log('Uploading approved icons image to Supabase storage...');
    const imagePath = 'system-assets/approved-icons.jpeg';

    const { error: uploadError } = await supabase.storage
      .from('banner-assets')
      .upload(imagePath, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    console.log(`Successfully uploaded approved icons image: ${imagePath}`);

    console.log('Updating system configuration...');
    const { error: updateError } = await supabase
      .from('system_config')
      .update({
        config_value: imagePath,
        updated_at: new Date().toISOString()
      })
      .eq('config_key', 'approved_icons_image_url');

    if (updateError) {
      throw new Error(`Config update failed: ${updateError.message}`);
    }

    console.log('Successfully updated system configuration');
    console.log('\nApproved icons setup complete!');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

uploadApprovedIcons();
