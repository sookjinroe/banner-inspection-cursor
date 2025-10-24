import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== 최근 검수 결과 확인 ===');

try {
  // 최근 검수 결과 확인
  const { data: results, error: resultsError } = await supabase
    .from('inspection_results')
    .select('*, banners(title)')
    .order('inspected_at', { ascending: false })
    .limit(10);

  if (resultsError) {
    console.error('Results error:', resultsError);
  } else {
    console.log('Recent inspection results:');
    results.forEach(result => {
      console.log(`- ${result.banners?.title || 'Unknown'}: ${result.inspected_at}`);
      if (result.banner_inspection_report) {
        const report = result.banner_inspection_report;
        console.log(`  Desktop: ${report.desktop?.overallStatus || 'N/A'}, Mobile: ${report.mobile?.overallStatus || 'N/A'}`);
      }
    });
  }

  // 최근 작업 상태 확인
  const { data: jobs, error: jobsError } = await supabase
    .from('inspection_jobs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (jobsError) {
    console.error('Jobs error:', jobsError);
  } else {
    console.log('\nRecent jobs:');
    jobs.forEach(job => {
      console.log(`- Job ${job.id}: ${job.status} (created: ${job.created_at})`);
    });
  }

  // 특정 작업의 로그 확인
  const { data: logs, error: logsError } = await supabase
    .from('inspection_job_logs')
    .select('*')
    .eq('job_id', 'd6275fae-73f0-4717-8d89-9c72bec5ec3c')
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Logs error:', logsError);
  } else {
    console.log('\nJob logs for d6275fae-73f0-4717-8d89-9c72bec5ec3c:');
    logs.forEach(log => {
      console.log(`- Banner ${log.banner_id}: ${log.status} (${log.created_at})`);
      if (log.error_message) {
        console.log(`  Error: ${log.error_message}`);
      }
    });
  }

} catch (error) {
  console.error('Check error:', error);
}
