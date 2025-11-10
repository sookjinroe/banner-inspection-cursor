import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Code, Loader2, ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { Button, Card, LoadingSpinner } from '../components/common';
import { Banner, BannerInspectionReport, CollectionResult } from '../types';
import { supabase } from '../services/supabase';
import { useCSSLoader } from '../hooks/useCSSLoader';
import { BannerPreview } from '../components/BannerPreview';
import { PreviewLightbox } from '../components/PreviewLightbox';
import { ViewportInspectionDisplay } from '../components/ViewportInspectionDisplay';
import { CodeViewModal } from '../components/CodeViewModal';
import { extractBaseUrl } from '../utils/bannerUtils';
import { createInspectionJob, subscribeToJob } from '../services/jobs';
import { isInspectionPassed, getInspectionSummary } from '../services/inspection';

export function InspectionDetailPage() {
  const { resultId, bannerId } = useParams<{ resultId: string; bannerId: string }>();
  const navigate = useNavigate();

  const [banner, setBanner] = useState<Banner | null>(null);
  const [allBanners, setAllBanners] = useState<Banner[]>([]);
  const [allInspections, setAllInspections] = useState<Map<string, BannerInspectionReport>>(new Map());
  const [inspection, setInspection] = useState<BannerInspectionReport | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(false);
  const [inspectingAll, setInspectingAll] = useState(false);
  const [inspectionProgress, setInspectionProgress] = useState<{ current: number; total: number } | null>(null);
  const [isCodeViewOpen, setIsCodeViewOpen] = useState(false);
  const [isDesktopLightboxOpen, setIsDesktopLightboxOpen] = useState(false);
  const [isMobileLightboxOpen, setIsMobileLightboxOpen] = useState(false);
  const [collectionName, setCollectionName] = useState<string>('');
  const [allCollections, setAllCollections] = useState<CollectionResult[]>([]);
  const [hidePassed, setHidePassed] = useState<boolean>(true); // 기본값: 통과한 배너 숨기기
  const [hidePassedResults, setHidePassedResults] = useState<boolean>(true); // 기본값: 검수 결과에서 '준수' 항목 숨기기

  useEffect(() => {
    loadAllCollections();
  }, []);

  useEffect(() => {
    if (resultId && bannerId) {
      setInspecting(false);
      setInspection(undefined);
      loadBannerData();
    }
  }, [resultId, bannerId]);

  // 현재 선택된 배너가 필터링되어 숨겨졌을 때 다른 배너로 자동 이동
  useEffect(() => {
    if (!banner || !resultId) return;

    const currentInspection = allInspections.get(banner.id);
    const currentPassed = isInspectionPassed(currentInspection);

    // hidePassed가 true이고 현재 배너가 Passed인 경우
    if (hidePassed && currentPassed) {
      // 필터링된 배너 목록에서 첫 번째 배너 찾기
      const filteredBanners = allBanners.filter((b) => {
        const inspection = allInspections.get(b.id);
        return !isInspectionPassed(inspection);
      });

      if (filteredBanners.length > 0) {
        navigateToBanner(filteredBanners[0].id);
      }
    }
  }, [hidePassed, banner, allBanners, allInspections, resultId]);

  useEffect(() => {
    if (!resultId) return;

    let unsubscribeJob: (() => void) | undefined;
    let unsubscribeInspections: (() => void) | undefined;

    const checkForActiveJob = async () => {
      const { data: collectionData } = await supabase
        .from('collection_results')
        .select('current_job_id')
        .eq('id', resultId)
        .maybeSingle();

      if (collectionData?.current_job_id) {
        unsubscribeJob = subscribeToJob(collectionData.current_job_id, (job) => {
          setInspectionProgress({
            current: job.progress_current,
            total: job.progress_total
          });

          if (job.status === 'completed' || job.status === 'failed') {
            setInspecting(false);
            setInspectingAll(false);
            loadBannerData();
          }
        });
      }
    };

    const subscribeToInspectionResults = () => {
      const channel = supabase
        .channel(`inspection-results-${resultId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'inspection_results',
          },
          (payload) => {
            console.log('[InspectionDetailPage] Inspection result updated:', payload);
            if (payload.new && 'banner_id' in payload.new) {
              loadBannerData();
            }
          }
        )
        .subscribe();

      unsubscribeInspections = () => {
        supabase.removeChannel(channel);
      };
    };

    checkForActiveJob();
    subscribeToInspectionResults();

    return () => {
      if (unsubscribeJob) unsubscribeJob();
      if (unsubscribeInspections) unsubscribeInspections();
    };
  }, [resultId]);

  async function loadAllCollections() {
    try {
      // 필요한 필드만 선택 (전체 데이터가 필요하지 않음)
      const { data, error } = await supabase
        .from('collection_results')
        .select('id, country_name, collected_at')
        .order('collected_at', { ascending: false });

      if (error) throw error;
      setAllCollections(data || []);
    } catch (err) {
      console.error('Failed to load collections:', err);
    }
  }

  async function loadBannerData() {
    if (!resultId || !bannerId) return;

    try {
      setLoading(true);

      // collection_data와 banners를 병렬로 가져오기
      const [collectionResponse, bannersResponse] = await Promise.all([
        supabase
          .from('collection_results')
          .select('country_name, country_url, css_file_url')
          .eq('id', resultId)
          .maybeSingle(),
        supabase
          .from('banners')
          .select('*')
          .eq('collection_result_id', resultId)
          .order('extracted_at', { ascending: true })
      ]);

      if (bannersResponse.error) throw bannersResponse.error;

      const collectionData = collectionResponse.data;
      if (collectionData) {
        setCollectionName(collectionData.country_name);
      }

      const bannersData = bannersResponse.data || [];
      const cssFileUrl = collectionData?.css_file_url;
      const countryUrl = collectionData?.country_url;

      const enrichedBanners = bannersData.map(b => ({
        ...b,
        css_file_url: cssFileUrl,
        country_url: countryUrl
      }));

      setAllBanners(enrichedBanners);

      const currentBanner = enrichedBanners.find(b => b.id === bannerId);
      if (currentBanner) {
        setBanner(currentBanner);
      }

      // inspections는 banner_ids를 알아야 하므로 banners 이후에 가져오기
      const bannerIds = enrichedBanners.map(b => b.id);
      
      // banner_ids가 많을 경우를 대비해 청크로 나누기 (Supabase .in() 제한)
      let inspectionsData: any[] = [];
      if (bannerIds.length > 0) {
        const chunkSize = 1000;
        const chunks: string[][] = [];
        for (let i = 0; i < bannerIds.length; i += chunkSize) {
          chunks.push(bannerIds.slice(i, i + chunkSize));
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

      const inspectionsMap = new Map<string, BannerInspectionReport>();
      inspectionsData.forEach(insp => {
        if (insp.banner_inspection_report) {
          inspectionsMap.set(insp.banner_id, insp.banner_inspection_report);
        }
      });
      setAllInspections(inspectionsMap);

      const currentInspection = inspectionsMap.get(bannerId);
      if (currentInspection) {
        setInspection(currentInspection);
      } else {
        setInspection(undefined);
      }
    } catch (err) {
      console.error('Failed to load banner data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleInspectCurrent() {
    if (!banner || !resultId) return;

    setInspecting(true);

    try {
      console.log('[InspectionDetailPage] Creating background job for single banner:', banner.id);
      const job = await createInspectionJob(resultId, 'single_banner', banner.id);
      console.log('[InspectionDetailPage] Job created successfully:', job.id);

      // Immediately start subscribing to the job
      const unsubscribe = subscribeToJob(job.id, (updatedJob) => {
        console.log('[InspectionDetailPage] Job update received:', updatedJob.status, updatedJob.progress_current, '/', updatedJob.progress_total);
        setInspectionProgress({
          current: updatedJob.progress_current,
          total: updatedJob.progress_total
        });

        if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
          console.log('[InspectionDetailPage] Job finished:', updatedJob.status);
          setInspecting(false);
          loadBannerData();
          unsubscribe();
        }
      });
    } catch (err) {
      console.error('Failed to start inspection:', err);
      alert(`Failed to start inspection: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setInspecting(false);
    }
  }

  async function handleInspectAll() {
    if (!resultId || allBanners.length === 0) return;

    setInspectingAll(true);

    try {
      console.log('[InspectionDetailPage] Creating background job for all banners');
      const job = await createInspectionJob(resultId, 'all_banners');
      console.log('[InspectionDetailPage] Job created successfully:', job.id);

      // Immediately start subscribing to the job
      const unsubscribe = subscribeToJob(job.id, (updatedJob) => {
        console.log('[InspectionDetailPage] Job update received:', updatedJob.status, updatedJob.progress_current, '/', updatedJob.progress_total);
        setInspectionProgress({
          current: updatedJob.progress_current,
          total: updatedJob.progress_total
        });

        if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
          console.log('[InspectionDetailPage] Job finished:', updatedJob.status);
          setInspectingAll(false);
          setInspectionProgress(null);
          loadBannerData();
          unsubscribe();
        }
      });
    } catch (err) {
      console.error('Failed to start inspection:', err);
      alert(`Failed to start inspection: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setInspectingAll(false);
      setInspectionProgress(null);
    }
  }

  function navigateToBanner(newBannerId: string) {
    navigate(`/inspection/${resultId}/banner/${newBannerId}`);
  }

  function getCurrentBannerIndex() {
    return allBanners.findIndex(b => b.id === bannerId);
  }

  function canNavigatePreviousBanner() {
    return getCurrentBannerIndex() > 0;
  }

  function canNavigateNextBanner() {
    return getCurrentBannerIndex() < allBanners.length - 1;
  }

  function handlePreviousBanner() {
    const currentIndex = getCurrentBannerIndex();
    if (currentIndex > 0) {
      navigateToBanner(allBanners[currentIndex - 1].id);
    }
  }

  function handleNextBanner() {
    const currentIndex = getCurrentBannerIndex();
    if (currentIndex < allBanners.length - 1) {
      navigateToBanner(allBanners[currentIndex + 1].id);
    }
  }

  function getCurrentCollectionIndex() {
    return allCollections.findIndex(c => c.id === resultId);
  }

  function canNavigatePreviousCollection() {
    return getCurrentCollectionIndex() > 0;
  }

  function canNavigateNextCollection() {
    return getCurrentCollectionIndex() < allCollections.length - 1;
  }

  async function handlePreviousCollection() {
    const currentIndex = getCurrentCollectionIndex();
    if (currentIndex > 0) {
      const prevCollection = allCollections[currentIndex - 1];
      const { data: bannersData } = await supabase
        .from('banners')
        .select('id')
        .eq('collection_result_id', prevCollection.id)
        .order('extracted_at', { ascending: true })
        .limit(1);

      if (bannersData && bannersData.length > 0) {
        navigate(`/inspection/${prevCollection.id}/banner/${bannersData[0].id}`);
      }
    }
  }

  async function handleNextCollection() {
    const currentIndex = getCurrentCollectionIndex();
    if (currentIndex < allCollections.length - 1) {
      const nextCollection = allCollections[currentIndex + 1];
      const { data: bannersData } = await supabase
        .from('banners')
        .select('id')
        .eq('collection_result_id', nextCollection.id)
        .order('extracted_at', { ascending: true })
        .limit(1);

      if (bannersData && bannersData.length > 0) {
        navigate(`/inspection/${nextCollection.id}/banner/${bannersData[0].id}`);
      }
    }
  }

  const { cssContent, loading: cssLoading, error: cssError } = useCSSLoader(banner?.css_file_url);
  const [effectiveCSS, setEffectiveCSS] = useState<string>('');

  useEffect(() => {
    if (banner) {
      if (cssContent) {
        setEffectiveCSS(cssContent);
      } else if (!cssLoading && banner.css_code) {
        setEffectiveCSS(banner.css_code);
      } else if (cssError && banner.css_code) {
        setEffectiveCSS(banner.css_code);
      } else {
        setEffectiveCSS('');
      }
    }
  }, [banner, cssContent, cssLoading, cssError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!banner) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-gray-500">Banner not found</p>
        <Button onClick={() => navigate('/inspection')} variant="secondary">
          <ArrowLeft className="w-4 h-4" />
          Back to Inspection
        </Button>
      </div>
    );
  }

  const baseUrl = banner.country_url ? extractBaseUrl(banner.country_url) : '';
  const isPassed = isInspectionPassed(inspection);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/inspection')}
                variant="secondary"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{collectionName}</span>
                <span>/</span>
                <span className="text-gray-900 font-medium">{banner.title}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {inspection && (
                <span className={`text-sm font-medium ${
                  isPassed ? 'text-green-600' : 'text-red-600'
                }`}>
                  {getInspectionSummary(inspection)}
                </span>
              )}
              <Button
                onClick={handlePreviousCollection}
                disabled={!canNavigatePreviousCollection()}
                variant="secondary"
                size="sm"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </Button>
              <Button
                onClick={handleNextCollection}
                disabled={!canNavigateNextCollection()}
                variant="secondary"
                size="sm"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleInspectAll}
                disabled={inspectingAll}
                variant="primary"
                size="sm"
              >
                {inspectingAll && inspectionProgress ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Inspecting {inspectionProgress.current} of {inspectionProgress.total}...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Inspect All
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3">
            <Card className="sticky top-6">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Banners
                  </h3>
                  <span className="text-xs text-gray-500">
                    {(() => {
                      const filtered = allBanners.filter((b) => {
                        if (hidePassed) {
                          const inspection = allInspections.get(b.id);
                          return !isInspectionPassed(inspection);
                        }
                        return true;
                      });
                      return filtered.length;
                    })()}
                  </span>
                </div>
                
                <div className="mb-3 pb-3 border-b border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={hidePassed}
                      onChange={(e) => setHidePassed(e.target.checked)}
                      className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-gray-900">
                      Hide passed banners
                    </span>
                  </label>
                </div>

                <div className="space-y-2">
                  {allBanners
                    .filter((b) => {
                      if (hidePassed) {
                        const inspection = allInspections.get(b.id);
                        return !isInspectionPassed(inspection);
                      }
                      return true;
                    })
                    .map((b) => {
                    const bannerInspection = allInspections.get(b.id);
                    const statusText = getInspectionSummary(bannerInspection);
                    const bannerPassed = isInspectionPassed(bannerInspection);
                    const isSelected = b.id === banner.id;

                    return (
                      <button
                        key={b.id}
                        onClick={() => navigateToBanner(b.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          isSelected
                            ? 'bg-gray-900 text-white shadow-sm'
                            : 'bg-white border border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-medium truncate flex-1 ${
                              isSelected ? 'text-white' : 'text-gray-900'
                            }`}>
                              {b.title}
                            </h4>
                            <span className={`text-xs uppercase flex-shrink-0 ${
                              isSelected ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {b.banner_type}
                            </span>
                          </div>

                          {b.screenshot_url && (
                            <div className="h-16 bg-gray-100 rounded overflow-hidden">
                              <img
                                src={b.screenshot_url}
                                alt={b.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {bannerInspection ? (
                            <span className={`text-xs font-medium ${
                              isSelected
                                ? (bannerPassed ? 'text-green-300' : 'text-red-300')
                                : (bannerPassed ? 'text-green-600' : 'text-red-600')
                            }`}>
                              {statusText}
                            </span>
                          ) : (
                            <span className={`text-xs ${
                              isSelected ? 'text-gray-400' : 'text-gray-400'
                            }`}>
                              Not inspected
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          <div className="col-span-9">
            <div className="mb-4 bg-white rounded-lg border border-gray-200 shadow-sm">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    onClick={handlePreviousBanner}
                    disabled={!canNavigatePreviousBanner()}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-600">
                    Banner {getCurrentBannerIndex() + 1} of {allBanners.length}
                  </span>
                  <Button
                    onClick={handleNextBanner}
                    disabled={!canNavigateNextBanner()}
                    variant="secondary"
                    size="sm"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setIsCodeViewOpen(true)}
                    variant="secondary"
                    size="sm"
                  >
                    <Code className="w-4 h-4" />
                    View Code
                  </Button>
                  <Button
                    onClick={handleInspectCurrent}
                    disabled={inspecting}
                    variant="primary"
                    size="sm"
                  >
                    {inspecting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Inspecting...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Inspect
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Desktop Preview</h2>
                    <button
                      onClick={() => setIsDesktopLightboxOpen(true)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Expand</span>
                    </button>
                  </div>

                  {cssError && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
                      <p className="text-sm text-yellow-800">
                        <span className="font-medium">CSS Loading Warning:</span> {cssError.message}
                        {banner.css_code && ' - Using fallback CSS from database.'}
                      </p>
                    </div>
                  )}

                  {cssLoading && banner.css_file_url && (
                    <div className="bg-gray-50 border border-gray-200 rounded p-8 flex items-center justify-center mb-4">
                      <LoadingSpinner />
                      <span className="ml-3 text-sm text-gray-600">Loading CSS...</span>
                    </div>
                  )}

                  <div className="min-h-[400px] flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                    <BannerPreview
                      bannerHtml={banner.html_code}
                      css={effectiveCSS}
                      baseUrl={baseUrl}
                      mode="desktop"
                    />
                  </div>
                </div>
              </Card>

              {inspection?.desktop && (
                <Card>
                  <div className="p-6">
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={hidePassedResults}
                          onChange={(e) => setHidePassedResults(e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          Hide passed items
                        </span>
                      </label>
                    </div>
                    <ViewportInspectionDisplay
                      inspection={inspection.desktop}
                      viewportName="Desktop"
                      hidePassed={hidePassedResults}
                    />
                  </div>
                </Card>
              )}

              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">Mobile Preview</h2>
                    <button
                      onClick={() => setIsMobileLightboxOpen(true)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-200"
                    >
                      <Maximize2 className="w-4 h-4" />
                      <span>Expand</span>
                    </button>
                  </div>

                  <div className="min-h-[500px] flex items-center justify-center p-8 bg-gray-50 rounded-lg border border-gray-200">
                    <BannerPreview
                      bannerHtml={banner.html_code}
                      css={effectiveCSS}
                      baseUrl={baseUrl}
                      mode="mobile"
                    />
                  </div>
                </div>
              </Card>

              {inspection?.mobile && (
                <Card>
                  <div className="p-6">
                    <div className="mb-4 pb-4 border-b border-gray-200">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={hidePassedResults}
                          onChange={(e) => setHidePassedResults(e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-2"
                        />
                        <span className="text-sm text-gray-700 group-hover:text-gray-900">
                          Hide passed items
                        </span>
                      </label>
                    </div>
                    <ViewportInspectionDisplay
                      inspection={inspection.mobile}
                      viewportName="Mobile"
                      hidePassed={hidePassedResults}
                    />
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {isDesktopLightboxOpen && (
        <PreviewLightbox
          bannerHtml={banner.html_code}
          css={effectiveCSS}
          baseUrl={baseUrl}
          onClose={() => setIsDesktopLightboxOpen(false)}
        />
      )}

      {isMobileLightboxOpen && (
        <PreviewLightbox
          bannerHtml={banner.html_code}
          css={effectiveCSS}
          baseUrl={baseUrl}
          onClose={() => setIsMobileLightboxOpen(false)}
        />
      )}

      <CodeViewModal
        isOpen={isCodeViewOpen}
        onClose={() => setIsCodeViewOpen(false)}
        htmlCode={banner.html_code}
        cssCode={effectiveCSS}
        imageUrls={banner.image_urls}
        baseUrl={baseUrl}
        bannerTitle={banner.title}
      />
    </div>
  );
}
