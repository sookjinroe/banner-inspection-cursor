import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== 인스펙션 작업 생성 테스트 ===');

try {
  // 인스펙션 작업 생성
  const { data: job, error: jobError } = await supabase
    .from('inspection_jobs')
    .insert({
      collection_result_id: '1211e855-24ce-4392-8604-48e6e53a6a47',
      job_type: 'all_banners'
    })
    .select()
    .single();

  if (jobError) {
    console.error('Job creation error:', jobError);
  } else {
    console.log('Job created:', job.id);
    
    // Edge Function 호출 테스트
    const response = await fetch('https://kfsawswzupmullhwrypa.supabase.co/functions/v1/process-inspection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.VITE_SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ jobId: job.id })
    });
    
    const result = await response.text();
    console.log('Edge Function response:', response.status, result);
  }
} catch (error) {
  console.error('Test error:', error);
}
