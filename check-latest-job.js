import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('=== 최신 작업 상세 확인 ===');

try {
  // 최신 작업 로그 확인
  const { data: logs, error: logsError } = await supabase
    .from('inspection_job_logs')
    .select('*')
    .eq('job_id', '635029bd-94e0-4665-a12b-8ad08ec7d939')
    .order('created_at', { ascending: false });

  if (logsError) {
    console.error('Logs error:', logsError);
  } else {
    console.log('Job logs for 635029bd-94e0-4665-a12b-8ad08ec7d939:');
    logs.forEach(log => {
      console.log(`- Banner ${log.banner_id}: ${log.status} (${log.created_at})`);
      if (log.error_message) {
        console.log(`  Error: ${log.error_message}`);
      }
    });
  }

  // 해당 배너들의 검수 결과 확인
  const bannerIds = logs.map(log => log.banner_id);
  console.log('\nChecking inspection results for banners:', bannerIds);

  const { data: results, error: resultsError } = await supabase
    .from('inspection_results')
    .select('*')
    .in('banner_id', bannerIds);

  if (resultsError) {
    console.error('Results error:', resultsError);
  } else {
    console.log(`Found ${results.length} inspection results:`);
    results.forEach(result => {
      console.log(`- Banner ${result.banner_id}: ${result.inspected_at}`);
      if (result.banner_inspection_report) {
        const report = result.banner_inspection_report;
        console.log(`  Desktop: ${report.desktop?.overallStatus || 'N/A'}, Mobile: ${report.mobile?.overallStatus || 'N/A'}`);
      }
    });
  }

  // 작업 상태 확인
  const { data: job, error: jobError } = await supabase
    .from('inspection_jobs')
    .select('*')
    .eq('id', '635029bd-94e0-4665-a12b-8ad08ec7d939')
    .single();

  if (jobError) {
    console.error('Job error:', jobError);
  } else {
    console.log('\nJob status:', job.status);
    console.log('Job error:', job.error_message);
  }

} catch (error) {
  console.error('Check error:', error);
}
