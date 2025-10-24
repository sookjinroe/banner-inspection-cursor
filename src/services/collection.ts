import { crawlUrl } from './crawler';
import { supabase } from './supabase';
import type { CollectionStatus } from '../types';

export interface CollectionProgress {
  status: CollectionStatus;
  message: string;
  progress: number;
}

export async function collectBannersFromUrl(
  url: string,
  onProgress?: (progress: CollectionProgress) => void,
  countryName?: string
): Promise<void> {

  onProgress?.({
    status: 'fetching_html',
    message: 'Crawling website and extracting banners...',
    progress: 30
  });

  const crawlResult = await crawlUrl(url);

  onProgress?.({
    status: 'extracting_banners',
    message: `Found ${crawlResult.banners.length} banners, saving to database...`,
    progress: 60
  });

  await saveCollectionResult(url, crawlResult.banners, crawlResult.css, countryName);

  onProgress?.({
    status: 'completed',
    message: `Successfully collected ${crawlResult.banners.length} banners.`,
    progress: 100
  });
}

async function saveCollectionResult(
  url: string,
  banners: Array<{
    dataTitle: string;
    bannerHtml: string;
    imageDesktop: string;
    imageMobile: string;
  }>,
  css: string,
  providedCountryName?: string
): Promise<string> {
  let countryName = providedCountryName;

  if (!countryName) {
    const urlObj = new URL(url);
    countryName = urlObj.hostname.replace('www.', '').replace('.lg.com', '').toUpperCase();
  }

  const { data: collectionResult, error: collectionError } = await supabase
    .from('collection_results')
    .insert({
      country_name: countryName,
      country_url: url,
      status: 'completed',
      banner_count: banners.length,
      inspection_status: 'not_inspected',
      collected_at: new Date().toISOString()
    })
    .select()
    .maybeSingle();

  if (collectionError || !collectionResult) {
    throw new Error('Failed to save collection result: ' + collectionError?.message);
  }

  let cssFileUrl: string | null = null;

  if (css && css.trim().length > 0) {
    const cssPath = `collections/${collectionResult.id}/styles.css`;
    const cssBlob = new Blob([css], { type: 'text/css' });
    const cssSizeKB = (cssBlob.size / 1024).toFixed(2);

    console.log(`Uploading CSS file (${cssSizeKB} KB) to ${cssPath}`);

    const { error: uploadError } = await supabase.storage
      .from('banner-assets')
      .upload(cssPath, cssBlob, {
        contentType: 'text/css',
        upsert: true
      });

    if (!uploadError) {
      cssFileUrl = cssPath;
      console.log(`Successfully uploaded CSS file: ${cssPath}`);
    } else {
      console.error('Failed to upload CSS file:', uploadError);
      throw new Error(`Failed to upload CSS file: ${uploadError.message}`);
    }
  } else {
    console.warn('No CSS content collected from the website');
  }

  if (cssFileUrl) {
    const { error: updateError } = await supabase
      .from('collection_results')
      .update({ css_file_url: cssFileUrl })
      .eq('id', collectionResult.id);

    if (updateError) {
      console.error('Failed to update collection with CSS file URL:', updateError);
    }
  }

  const bannerInserts = banners.map(banner => ({
    collection_result_id: collectionResult.id,
    title: banner.dataTitle || 'Untitled Banner',
    banner_type: 'web' as const,
    html_code: banner.bannerHtml,
    css_code: '',
    image_urls: [banner.imageDesktop, banner.imageMobile].filter(Boolean) as string[],
    image_desktop: banner.imageDesktop || null,
    image_mobile: banner.imageMobile || null,
    extracted_at: new Date().toISOString()
  }));

  const { error: bannersError } = await supabase
    .from('banners')
    .insert(bannerInserts);

  if (bannersError) {
    throw new Error('Failed to save banners: ' + bannersError.message);
  }

  return collectionResult.id;
}
