import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

const collectionId = 'de079f14-b664-436d-85df-64ba1780ee92';
const cssFilePath = './au-css.txt';

async function uploadCSS() {
  try {
    console.log('Reading CSS file...');
    const cssContent = readFileSync(cssFilePath, 'utf-8');
    console.log(`CSS file size: ${cssContent.length} bytes`);

    const storagePath = `collections/${collectionId}/styles.css`;
    console.log(`Uploading to: ${storagePath}`);

    const { data, error } = await supabase.storage
      .from('banner-images')
      .upload(storagePath, cssContent, {
        contentType: 'text/css',
        upsert: true
      });

    if (error) {
      console.error('Upload error:', error);
      process.exit(1);
    }

    console.log('Upload successful:', data);

    console.log('Updating collection_results table...');
    const { error: updateError } = await supabase
      .from('collection_results')
      .update({ css_file_url: storagePath })
      .eq('id', collectionId);

    if (updateError) {
      console.error('Update error:', updateError);
      process.exit(1);
    }

    console.log('✓ Database updated successfully!');
    console.log('✓ CSS file URL:', storagePath);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

uploadCSS();
