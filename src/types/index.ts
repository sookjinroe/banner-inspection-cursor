export type BannerType = 'web' | 'mobile';

export type CollectionStatus = 'idle' | 'fetching_html' | 'parsing_dom' | 'extracting_banners' | 'collecting_css' | 'capturing_screenshots' | 'completed' | 'failed';

export type InspectionStatus = 'not_inspected' | 'inspecting' | 'inspected';

export type ViewportMode = 'desktop' | 'mobile';

export interface Country {
  id: string;
  name: string;
  url: string;
  created_at: string;
}

export interface CollectionResult {
  id: string;
  country_id: string;
  country_name: string;
  country_url: string;
  collected_at: string;
  status: CollectionStatus;
  inspection_status: InspectionStatus;
  banner_count?: number;
  passed_count?: number;
  error_message?: string;
  css_file_url?: string;
  current_job_id?: string;
}

export interface Banner {
  id: string;
  collection_result_id: string;
  title: string;
  banner_type: BannerType;
  html_code: string;
  css_code: string;
  css_file_url?: string;
  country_url?: string;
  image_urls: string[];
  image_desktop?: string;
  image_mobile?: string;
  screenshot_url?: string;
  extracted_at: string;
}

export interface BannerInspectionReport {
  desktop: ViewportInspection;
  mobile: ViewportInspection;
}

export interface ViewportInspection {
  overallStatus: '적합' | '부적합' | '준수';
  issues?: InspectionIssue[];
  detailedReport: DetailedReportItem[];
}

export interface InspectionIssue {
  category: string;
  description: string;
}

export interface DetailedReportItem {
  category: string;
  status: '준수' | '위반';
  comment: string;
}

export interface CollectionJob {
  country_id: string;
  status: CollectionStatus;
  progress: number;
  current_step: string;
  logs: string[];
}
