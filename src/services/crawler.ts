export interface BannerData {
  dataTitle: string;
  bannerHtml: string;
  imageDesktop: string;
  imageMobile: string;
}

export interface CrawlResult {
  banners: BannerData[];
  css: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const apiUrl = `${supabaseUrl}/functions/v1/crawl-banners`;

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to crawl URL');
  }

  return await response.json();
}
