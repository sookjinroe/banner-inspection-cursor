import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';
import { Button, Card, LoadingSpinner, StatusBadge, ConfirmDialog } from '../components/common';
import { CollectionResult, BannerInspectionReport } from '../types';
import { supabase } from '../services/supabase';
import { createInspectionJob, getActiveJob, subscribeToJob, type InspectionJob } from '../services/jobs';

export function InspectionPage() {
  const navigate = useNavigate();
  const [results, setResults] = useState<CollectionResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; resultId: string | null }>({ isOpen: false, resultId: null });
  const [deleting, setDeleting] = useState(false);
  const [bannerCounts, setBannerCounts] = useState<Map<string, { total: number; inspected: number; passed: number }>>(new Map());
  const [activeJobs, setActiveJobs] = useState<Map<string, InspectionJob>>(new Map());

  useEffect(() => {
    loadResults();
  }, []);

  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    results.forEach((result) => {
      if (result.current_job_id) {
        const unsubscribe = subscribeToJob(result.current_job_id, (job) => {
          setActiveJobs((prev) => {
            const newMap = new Map(prev);
            newMap.set(result.id, job);
            return newMap;
          });

          if (job.status === 'completed' || job.status === 'failed') {
            loadResults();
          }
        });
        unsubscribeFunctions.push(unsubscribe);
      }
    });

    return () => {
      unsubscribeFunctions.forEach((unsubscribe) => unsubscribe());
    };
  }, [results]);

  async function loadResults() {
    try {
      const { data, error } = await supabase
        .from('collection_results')
        .select('*')
        .order('collected_at', { ascending: false });

      if (error) throw error;
      setResults(data || []);

      if (data && data.length > 0) {
        const resultIds = data.map(r => r.id);
        
        // 모든 banners와 active jobs를 병렬로 가져오기
        const resultsWithJobs = data.filter(r => r.current_job_id);
        const [bannersResponse, activeJobsResults] = await Promise.all([
          // 모든 banners를 한 번에 가져오기
          supabase
            .from('banners')
            .select('id, collection_result_id')
            .in('collection_result_id', resultIds),
          // 모든 active jobs를 한 번에 가져오기
          Promise.all(
            resultsWithJobs.map(r => getActiveJob(r.id))
          )
        ]);

        // banners를 collection_result_id별로 그룹화
        const bannersByCollection = new Map<string, string[]>();
        if (bannersResponse.data) {
          bannersResponse.data.forEach(banner => {
            const collectionId = banner.collection_result_id;
            if (!bannersByCollection.has(collectionId)) {
              bannersByCollection.set(collectionId, []);
            }
            bannersByCollection.get(collectionId)!.push(banner.id);
          });
        }

        // banner_ids를 수집
        const allBannerIds = Array.from(bannersByCollection.values()).flat();
        
        // inspection_results를 가져오기 (banner_ids가 있을 때만)
        let inspectionsData: any[] = [];
        if (allBannerIds.length > 0) {
          // Supabase의 .in()은 최대 1000개까지만 지원하므로 청크로 나눔
          const chunkSize = 1000;
          const chunks: string[][] = [];
          for (let i = 0; i < allBannerIds.length; i += chunkSize) {
            chunks.push(allBannerIds.slice(i, i + chunkSize));
          }
          
          const inspectionPromises = chunks.map(chunk =>
            supabase
              .from('inspection_results')
              .select('banner_id, banner_inspection_report')
              .in('banner_id', chunk)
          );
          
          const inspectionResponses = await Promise.all(inspectionPromises);
          inspectionsData = inspectionResponses.flatMap(res => res.data || []);
        }

        // inspections를 banner_id별로 맵핑
        const inspectionsByBannerId = new Map<string, any>();
        inspectionsData.forEach(insp => {
          inspectionsByBannerId.set(insp.banner_id, insp);
        });

        // counts 계산
        const counts = new Map();
        const jobs = new Map();

        data.forEach(result => {
          const bannerIds = bannersByCollection.get(result.id) || [];
          const totalBanners = bannerIds.length;

          if (totalBanners > 0) {
            let inspectedCount = 0;
            let passedCount = 0;

            bannerIds.forEach(bannerId => {
              const inspection = inspectionsByBannerId.get(bannerId);
              if (inspection && inspection.banner_inspection_report) {
                inspectedCount++;
                const report = inspection.banner_inspection_report as BannerInspectionReport;
                if (report.desktop?.overallStatus === '적합' && report.mobile?.overallStatus === '적합') {
                  passedCount++;
                }
              }
            });

            counts.set(result.id, {
              total: totalBanners,
              inspected: inspectedCount,
              passed: passedCount
            });
          } else {
            counts.set(result.id, {
              total: 0,
              inspected: 0,
              passed: 0
            });
          }

          // active jobs 설정
          const jobIndex = resultsWithJobs.findIndex(r => r.id === result.id);
          if (jobIndex >= 0 && activeJobsResults[jobIndex]) {
            jobs.set(result.id, activeJobsResults[jobIndex]);
          }
        });

        setBannerCounts(counts);
        setActiveJobs(jobs);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInspect(resultId: string) {
    setInspecting(new Set(inspecting).add(resultId));

    try {
      console.log('[InspectionPage] Creating background job for collection:', resultId);

      await createInspectionJob(resultId, 'all_banners');

      console.log('[InspectionPage] Job created successfully, inspection will continue in background');

      await loadResults();
    } catch (err) {
      console.error('Failed to start inspection:', err);
      alert(`Failed to start inspection: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      const newInspecting = new Set(inspecting);
      newInspecting.delete(resultId);
      setInspecting(newInspecting);
    }
  }

  function openDeleteConfirm(resultId: string) {
    setDeleteConfirm({ isOpen: true, resultId });
  }

  function closeDeleteConfirm() {
    setDeleteConfirm({ isOpen: false, resultId: null });
  }

  async function handleDelete() {
    if (!deleteConfirm.resultId) return;

    setDeleting(true);

    try {
      console.log('[InspectionPage] Deleting collection_result:', deleteConfirm.resultId);
      
      const { data, error } = await supabase
        .from('collection_results')
        .delete()
        .eq('id', deleteConfirm.resultId)
        .select();

      console.log('[InspectionPage] Delete response:', { data, error });

      if (error) {
        console.error('[InspectionPage] Delete error details:', error);
        throw error;
      }

      console.log('[InspectionPage] Delete successful, reloading results...');
      await loadResults();
      closeDeleteConfirm();
    } catch (err) {
      console.error('Failed to delete collection result:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      alert(`Failed to delete: ${errorMessage}`);
    } finally {
      setDeleting(false);
    }
  }

  async function handleViewBanners(resultId: string) {
    const { data: bannersData } = await supabase
      .from('banners')
      .select('id')
      .eq('collection_result_id', resultId)
      .order('extracted_at', { ascending: true })
      .limit(1);

    if (bannersData && bannersData.length > 0) {
      navigate(`/inspection/${resultId}/banner/${bannersData[0].id}`);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-light tracking-tight">Inspection</h1>
      </div>

      <div className="space-y-3">
        {results.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-gray-500">No collection results yet</p>
          </Card>
        ) : (
          results.map((result) => {
            const isInspecting = inspecting.has(result.id);
            const counts = bannerCounts.get(result.id);
            const activeJob = activeJobs.get(result.id);
            const isJobRunning = activeJob && (activeJob.status === 'pending' || activeJob.status === 'processing');

            return (
              <Card key={result.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <button
                      onClick={() => handleViewBanners(result.id)}
                      className="flex-1 text-left hover:opacity-70 transition-opacity"
                    >
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-medium">{result.country_name}</h3>
                        <p className="text-sm text-gray-500 truncate">{result.country_url}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                          <span>{formatDate(result.collected_at)}</span>
                          <span>{counts?.total || 0} banners</span>
                          {counts && (
                            <>
                              <span>{counts.inspected}/{counts.total} inspected</span>
                              <span className={counts.passed === counts.total && counts.total > 0 ? 'text-green-600 font-medium' : ''}>
                                {counts.passed}/{counts.total} passed
                              </span>
                            </>
                          )}
                          {isJobRunning && activeJob && (
                            <span className="text-blue-600 font-medium">
                              Processing {activeJob.progress_current}/{activeJob.progress_total}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>

                    <div className="flex items-center gap-3 ml-4">
                      <StatusBadge
                        status={isJobRunning ? 'inspecting' : result.inspection_status}
                      />
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(result.id);
                        }}
                        disabled={isInspecting || isJobRunning}
                        variant="primary"
                        size="sm"
                      >
                        <Play className="w-4 h-4" />
                        {isInspecting ? 'Starting...' : isJobRunning ? 'Inspecting...' : 'Inspect'}
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteConfirm(result.id);
                        }}
                        variant="secondary"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        onClose={closeDeleteConfirm}
        onConfirm={handleDelete}
        title="Delete Collection Result"
        message="Are you sure you want to delete this collection result? This will permanently delete all banners and inspection results associated with it. This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}
