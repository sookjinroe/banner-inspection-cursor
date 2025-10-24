import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== system_config 테이블 확인 ===');

const { data: config, error } = await supabase
  .from('system_config')
  .select('*');

if (error) {
  console.error('Config error:', error);
} else {
  console.log('Config data:', config);
}
