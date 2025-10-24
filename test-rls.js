import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== RLS 정책 확인 ===');

try {
  // inspection_results 테이블에 직접 삽입 시도
  const testData = {
    banner_id: 'test-banner-id',
    banner_inspection_report: { test: 'data' },
    inspected_at: new Date().toISOString()
  };

  const { data, error } = await supabase
    .from('inspection_results')
    .insert(testData);

  if (error) {
    console.error('Insert error:', error);
  } else {
    console.log('Insert successful:', data);
    
    // 테스트 데이터 삭제
    await supabase
      .from('inspection_results')
      .delete()
      .eq('banner_id', 'test-banner-id');
  }
} catch (error) {
  console.error('Test error:', error);
}
