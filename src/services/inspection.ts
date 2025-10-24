import { supabase } from './supabase';
import type { BannerInspectionReport } from '../types';

export async function getApprovedIconsImageUrl(): Promise<string> {
  console.log('[Inspection] Fetching approved icons configuration from database...');

  const { data, error } = await supabase
    .from('system_config')
    .select('config_value')
    .eq('config_key', 'approved_icons_image_url')
    .maybeSingle();

  if (error) {
    console.error('[Inspection] Failed to fetch approved icons config:', error);
    throw new Error('Failed to load approved icons configuration');
  }

  if (!data?.config_value) {
    console.error('[Inspection] Approved icons image URL not found in system_config');
    throw new Error('Approved icons image URL not configured. Please upload the approved icons image first.');
  }

  console.log('[Inspection] Found approved icons path:', data.config_value);

  const { data: urlData } = supabase.storage
    .from('banner-assets')
    .getPublicUrl(data.config_value);

  console.log('[Inspection] Generated public URL:', urlData.publicUrl);

  return urlData.publicUrl;
}

export async function getInspectionResult(bannerId: string): Promise<BannerInspectionReport | null> {
  console.log('[Inspection] Fetching inspection result for banner:', bannerId);

  const { data, error } = await supabase
    .from('inspection_results')
    .select('banner_inspection_report')
    .eq('banner_id', bannerId)
    .maybeSingle();

  if (error) {
    console.error('[Inspection] Failed to fetch inspection result:', error);
    throw new Error(`Failed to fetch inspection result: ${error.message}`);
  }

  if (!data) {
    console.log('[Inspection] No inspection result found for banner:', bannerId);
    return null;
  }

  return data.banner_inspection_report as BannerInspectionReport;
}

export async function deleteInspectionResult(bannerId: string): Promise<void> {
  console.log('[Inspection] Deleting inspection result for banner:', bannerId);

  const { error } = await supabase
    .from('inspection_results')
    .delete()
    .eq('banner_id', bannerId);

  if (error) {
    console.error('[Inspection] Failed to delete inspection result:', error);
    throw new Error(`Failed to delete inspection result: ${error.message}`);
  }

  console.log('[Inspection] Successfully deleted inspection result');
}

export function isInspectionPassed(report: BannerInspectionReport | null | undefined): boolean {
  if (!report) return false;

  return (
    (report.desktop?.overallStatus === '적합' || report.desktop?.overallStatus === '준수') &&
    (report.mobile?.overallStatus === '적합' || report.mobile?.overallStatus === '준수')
  );
}

export function getInspectionSummary(report: BannerInspectionReport | null | undefined): string {
  if (!report) return 'Not inspected';

  const desktopStatus = report.desktop?.overallStatus || '미검수';
  const mobileStatus = report.mobile?.overallStatus || '미검수';

  if ((desktopStatus === '적합' || desktopStatus === '준수') && (mobileStatus === '적합' || mobileStatus === '준수')) {
    return 'Passed';
  } else if (desktopStatus === '부적합' || mobileStatus === '부적합') {
    return 'Failed';
  } else {
    return 'Partial';
  }
}

export function getInspectionIssueCount(report: BannerInspectionReport | null | undefined): number {
  if (!report) return 0;

  const desktopIssues = report.desktop?.issues?.length || 0;
  const mobileIssues = report.mobile?.issues?.length || 0;

  return desktopIssues + mobileIssues;
}
