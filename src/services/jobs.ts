import { supabase } from './supabase';

export interface InspectionJob {
  id: string;
  collection_result_id: string;
  job_type: 'single_banner' | 'all_banners';
  banner_id: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress_current: number;
  progress_total: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface InspectionJobLog {
  id: string;
  job_id: string;
  banner_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'skipped';
  result_summary: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export async function createInspectionJob(
  collectionResultId: string,
  jobType: 'single_banner' | 'all_banners',
  bannerId?: string
): Promise<InspectionJob> {
  console.log('[Jobs] Creating inspection job:', { collectionResultId, jobType, bannerId });

  const jobData: any = {
    collection_result_id: collectionResultId,
    job_type: jobType,
    status: 'pending',
  };

  if (jobType === 'single_banner' && bannerId) {
    jobData.banner_id = bannerId;
  }

  const { data, error } = await supabase
    .from('inspection_jobs')
    .insert(jobData)
    .select()
    .single();

  if (error) {
    console.error('[Jobs] Failed to create job:', error);
    throw new Error(`Failed to create inspection job: ${error.message}`);
  }

  console.log('[Jobs] Job created successfully:', data.id);

  // Update collection with current job
  await supabase
    .from('collection_results')
    .update({ current_job_id: data.id })
    .eq('id', collectionResultId);

  // Trigger edge function to process the job
  await triggerJobProcessing(data.id);

  return data;
}

async function triggerJobProcessing(jobId: string): Promise<void> {
  console.log('[Jobs] Triggering edge function for job:', jobId);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase configuration missing');
  }

  const apiUrl = `${supabaseUrl}/functions/v1/process-inspection`;

  // Fire-and-forget: Don't wait for the edge function to complete
  // The job will run in the background and update the database
  fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ jobId }),
  }).then(response => {
    if (!response.ok) {
      console.error('[Jobs] Edge function returned error status:', response.status);
    } else {
      console.log('[Jobs] Edge function triggered successfully');
    }
  }).catch(error => {
    // This might happen if the edge function takes too long
    // But the job is still running in the background
    console.warn('[Jobs] Edge function call timed out (job is still running in background):', error);
  });

  // Return immediately - don't wait for the edge function
  console.log('[Jobs] Background job started, will process asynchronously');
}

export async function getJob(jobId: string): Promise<InspectionJob | null> {
  const { data, error } = await supabase
    .from('inspection_jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error) {
    console.error('[Jobs] Failed to get job:', error);
    return null;
  }

  return data;
}

export async function getJobsByCollection(collectionResultId: string): Promise<InspectionJob[]> {
  const { data, error } = await supabase
    .from('inspection_jobs')
    .select('*')
    .eq('collection_result_id', collectionResultId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Jobs] Failed to get jobs:', error);
    return [];
  }

  return data || [];
}

export async function getActiveJob(collectionResultId: string): Promise<InspectionJob | null> {
  const { data, error } = await supabase
    .from('inspection_jobs')
    .select('*')
    .eq('collection_result_id', collectionResultId)
    .in('status', ['pending', 'processing'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[Jobs] Failed to get active job:', error);
    return null;
  }

  return data;
}

export async function getJobLogs(jobId: string): Promise<InspectionJobLog[]> {
  const { data, error } = await supabase
    .from('inspection_job_logs')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[Jobs] Failed to get job logs:', error);
    return [];
  }

  return data || [];
}

export async function cancelJob(jobId: string): Promise<void> {
  console.log('[Jobs] Cancelling job:', jobId);

  const { error } = await supabase
    .from('inspection_jobs')
    .update({ status: 'cancelled', completed_at: new Date().toISOString() })
    .eq('id', jobId);

  if (error) {
    console.error('[Jobs] Failed to cancel job:', error);
    throw new Error(`Failed to cancel job: ${error.message}`);
  }

  console.log('[Jobs] Job cancelled successfully');
}

export function subscribeToJob(
  jobId: string,
  onUpdate: (job: InspectionJob) => void
): () => void {
  console.log('[Jobs] Subscribing to job updates:', jobId);

  const channel = supabase
    .channel(`job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'inspection_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        console.log('[Jobs] Job updated:', payload.new);
        onUpdate(payload.new as InspectionJob);
      }
    )
    .subscribe();

  return () => {
    console.log('[Jobs] Unsubscribing from job updates:', jobId);
    supabase.removeChannel(channel);
  };
}

export function subscribeToJobLogs(
  jobId: string,
  onUpdate: (log: InspectionJobLog) => void
): () => void {
  console.log('[Jobs] Subscribing to job log updates:', jobId);

  const channel = supabase
    .channel(`job-logs-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'inspection_job_logs',
        filter: `job_id=eq.${jobId}`,
      },
      (payload) => {
        console.log('[Jobs] Job log updated:', payload);
        if (payload.new) {
          onUpdate(payload.new as InspectionJobLog);
        }
      }
    )
    .subscribe();

  return () => {
    console.log('[Jobs] Unsubscribing from job log updates:', jobId);
    supabase.removeChannel(channel);
  };
}
