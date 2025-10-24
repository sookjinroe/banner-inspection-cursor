import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = 'https://mfotyqmhbzmxhhmfojjd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mb3R5cW1oYnpteGhobWZvampkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NDI3MzMsImV4cCI6MjA3NjExODczM30.Meg1IEN1j3jtjHzJ8FdkQnkrkH-1HFrQldCkWKsFDE0';
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
