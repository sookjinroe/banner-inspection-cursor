export function resolveImageUrl(url: string | null | undefined, baseUrl?: string): string | null {
  if (!url) return null;

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (!baseUrl) {
    return url;
  }

  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  return `${base}${cleanUrl}`;
}

export function extractBaseUrl(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return `${url.protocol}//${url.host}`;
  } catch {
    return fullUrl;
  }
}

export function fixImageUrlsInHtml(html: string, baseUrl?: string): string {
  return html.replace(
    /(src|srcset|srcSet)=["'](\/?content\/[^"']+)["']/gi,
    (_match, attr, path) => {
      const fullUrl = resolveImageUrl(path, baseUrl);
      return `${attr}="${fullUrl}"`;
    }
  );
}

export function getResponsiveImageUrls(
  banner: {
    image_desktop?: string;
    image_mobile?: string;
    image_urls?: string[];
  },
  baseUrl?: string
): { desktop: string | null; mobile: string | null } {
  let desktop = resolveImageUrl(banner.image_desktop, baseUrl);
  let mobile = resolveImageUrl(banner.image_mobile, baseUrl);

  if (!desktop && !mobile && banner.image_urls && banner.image_urls.length > 0) {
    desktop = resolveImageUrl(banner.image_urls[0], baseUrl);
    mobile = resolveImageUrl(banner.image_urls[1], baseUrl) || desktop;
  }

  return { desktop, mobile };
}

export function getBannerAspectRatio(viewportMode: 'desktop' | 'mobile'): string {
  return viewportMode === 'desktop' ? '1920 / 720' : '720 / 960';
}

export function getBannerDimensions(viewportMode: 'desktop' | 'mobile'): { width: number; height: number } {
  return viewportMode === 'desktop'
    ? { width: 1920, height: 720 }
    : { width: 720, height: 960 };
}
