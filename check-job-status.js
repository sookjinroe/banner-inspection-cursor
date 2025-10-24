import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== 최근 인스펙션 작업 상태 확인 ===');

try {
  // 최근 인스펙션 작업들 확인
  const { data: jobs, error: jobsError } = await supabase
    .from('inspection_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (jobsError) {
    console.error('Jobs error:', jobsError);
  } else {
    console.log('Recent jobs:');
    jobs.forEach(job => {
      console.log(`- Job ${job.id}: ${job.status} (created: ${job.created_at})`);
      if (job.error_message) {
        console.log(`  Error: ${job.error_message}`);
      }
    });
  }

  // 최근 작업 로그 확인
  const { data: logs, error: logsError } = await supabase
    .from('inspection_job_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logsError) {
    console.error('Logs error:', logsError);
  } else {
    console.log('\nRecent job logs:');
    logs.forEach(log => {
      console.log(`- Log ${log.id}: ${log.status} (job: ${log.job_id})`);
      if (log.error_message) {
        console.log(`  Error: ${log.error_message}`);
      }
    });
  }

  // 최근 검수 결과 확인
  const { data: results, error: resultsError } = await supabase
    .from('inspection_results')
    .select('*')
    .order('inspected_at', { ascending: false })
    .limit(5);

  if (resultsError) {
    console.error('Results error:', resultsError);
  } else {
    console.log('\nRecent inspection results:');
    results.forEach(result => {
      console.log(`- Result ${result.id}: banner ${result.banner_id}`);
    });
  }

} catch (error) {
  console.error('Check error:', error);
}
