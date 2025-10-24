import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

function extractBaseUrl(url) {
  try {
    const urlObj = new URL(url);
    return `${urlObj.protocol}//${urlObj.host}`;
  } catch {
    return 'https://www.lg.com';
  }
}

function extractImageUrls(htmlCode) {
  const desktopMatch = htmlCode.match(/media="\(min-width:\s*769px\)"\s*srcSet="([^"]+)"/i);
  const mobileMatch = htmlCode.match(/media="\(max-width:\s*768px\)"\s*srcSet="([^"]+)"/i);

  return {
    desktop: desktopMatch ? desktopMatch[1] : null,
    mobile: mobileMatch ? mobileMatch[1] : null
  };
}

function resolveImageUrl(url, baseUrl) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${cleanUrl}`;
}

async function fixBannerImages() {
  console.log('Fetching banners with null image URLs...');

  const { data: banners, error: fetchError } = await supabase
    .from('banners')
    .select('id, html_code, collection_result_id')
    .or('image_desktop.is.null,image_mobile.is.null');

  if (fetchError) {
    console.error('Error fetching banners:', fetchError);
    return;
  }

  console.log(`Found ${banners.length} banners to fix`);

  for (const banner of banners) {
    const { data: collection } = await supabase
      .from('collection_results')
      .select('country_url')
      .eq('id', banner.collection_result_id)
      .maybeSingle();

    const baseUrl = collection ? extractBaseUrl(collection.country_url) : 'https://www.lg.com';
    const { desktop, mobile } = extractImageUrls(banner.html_code);

    const desktopUrl = resolveImageUrl(desktop, baseUrl);
    const mobileUrl = resolveImageUrl(mobile, baseUrl);

    console.log(`Updating banner ${banner.id}:`);
    console.log(`  Desktop: ${desktopUrl}`);
    console.log(`  Mobile: ${mobileUrl}`);

    const { error: updateError } = await supabase
      .from('banners')
      .update({
        image_desktop: desktopUrl,
        image_mobile: mobileUrl,
        image_urls: [desktopUrl, mobileUrl].filter(Boolean)
      })
      .eq('id', banner.id);

    if (updateError) {
      console.error(`Error updating banner ${banner.id}:`, updateError);
    } else {
      console.log(`✓ Updated banner ${banner.id}`);
    }
  }

  console.log('Done!');
}

fixBannerImages().catch(console.error);
