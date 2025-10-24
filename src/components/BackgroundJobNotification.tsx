import { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { subscribeToJob, type InspectionJob } from '../services/jobs';

export function BackgroundJobNotification() {
  const [jobs, setJobs] = useState<Map<string, InspectionJob>>(new Map());

  useEffect(() => {
    loadActiveJobs();
    const interval = setInterval(loadActiveJobs, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    jobs.forEach((job) => {
      if (job.status === 'pending' || job.status === 'processing') {
        const unsubscribe = subscribeToJob(job.id, (updatedJob) => {
          setJobs((prev) => {
            const newMap = new Map(prev);
            if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
              setTimeout(() => {
                setJobs((current) => {
                  const filtered = new Map(current);
                  filtered.delete(updatedJob.id);
                  return filtered;
                });
              }, 5000);
            }
            newMap.set(updatedJob.id, updatedJob);
            return newMap;
          });
        });
        unsubscribeFunctions.push(unsubscribe);
      }
    });

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [jobs]);

  async function loadActiveJobs() {
    const { data, error } = await supabase
      .from('inspection_jobs')
      .select(`
        *,
        collection_results!inspection_jobs_collection_result_id_fkey(country_name)
      `)
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load active jobs:', error);
      return;
    }

    if (data) {
      const jobsMap = new Map();
      data.forEach((job) => {
        jobsMap.set(job.id, job);
      });
      setJobs(jobsMap);
    }
  }

  if (jobs.size === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 space-y-3 max-w-md">
      {Array.from(jobs.values()).map((job) => {
        const collectionName = (job as any).collection_results?.country_name || 'Collection';
        const progress = job.progress_total > 0
          ? Math.round((job.progress_current / job.progress_total) * 100)
          : 0;

        return (
          <div
            key={job.id}
            className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[320px] animate-slide-up"
          >
            <div className="flex items-start gap-3">
              {job.status === 'processing' && (
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
              )}
              {job.status === 'completed' && (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              )}
              {job.status === 'failed' && (
                <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}

              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900">
                  {job.status === 'pending' && 'Starting inspection...'}
                  {job.status === 'processing' && 'Inspecting banners'}
                  {job.status === 'completed' && 'Inspection completed'}
                  {job.status === 'failed' && 'Inspection failed'}
                </h4>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {collectionName}
                </p>
                {job.status === 'processing' && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>
                        {job.progress_current} of {job.progress_total} banners
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}
                {job.status === 'failed' && job.error_message && (
                  <p className="text-xs text-red-600 mt-1">{job.error_message}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
