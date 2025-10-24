import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const BUCKET_NAME = 'banner-assets';

async function uploadIconGuide() {
  try {
    console.log('Starting icon guide upload process...\n');

    // 1. 기존 파일 목록 확인
    console.log('Checking existing files in banner-assets bucket...');
    const { data: existingFiles, error: listError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 100,
        offset: 0,
      });

    if (listError) {
      console.error('Error listing files:', listError);
    } else {
      console.log(`Found ${existingFiles.length} existing files`);

      // 2. 기존 파일 삭제 (원하는 경우)
      if (existingFiles.length > 0) {
        console.log('\nDeleting old files...');
        const filesToDelete = existingFiles.map(file => file.name);

        const { error: deleteError } = await supabase
          .storage
          .from(BUCKET_NAME)
          .remove(filesToDelete);

        if (deleteError) {
          console.error('Error deleting files:', deleteError);
        } else {
          console.log(`✓ Deleted ${filesToDelete.length} old files`);
        }
      }
    }

    // 3. 새 아이콘 가이드 이미지 업로드
    console.log('\nUploading new icon guide image...');

    const filePath = resolve(process.cwd(), 'public/Value_Prop_icon_compressed.jpg');
    const fileBuffer = readFileSync(filePath);

    // 파일명을 의미있게 변경
    const fileName = 'icon-style-guide.jpg';

    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(BUCKET_NAME)
      .upload(fileName, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      throw uploadError;
    }

    console.log(`✓ Successfully uploaded: ${fileName}`);

    // 4. Public URL 생성
    const { data: urlData } = supabase
      .storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    console.log('\n--- Upload Complete ---');
    console.log(`File Name: ${fileName}`);
    console.log(`Public URL: ${urlData.publicUrl}`);
    console.log('\nYou can now reference this image in your application.');

  } catch (error) {
    console.error('Upload failed:', error);
    process.exit(1);
  }
}

uploadIconGuide();
