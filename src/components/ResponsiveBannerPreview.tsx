import { useState } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { Button } from './common';
import { ViewportMode } from '../types';
import { getResponsiveImageUrls, getBannerAspectRatio, fixImageUrlsInHtml } from '../utils/bannerUtils';

interface ResponsiveBannerPreviewProps {
  banner: {
    title: string;
    html_code: string;
    css_code?: string;
    image_desktop?: string;
    image_mobile?: string;
    image_urls?: string[];
  };
  cssContent?: string;
  loading?: boolean;
  baseUrl?: string;
}

export function ResponsiveBannerPreview({ banner, cssContent, loading, baseUrl }: ResponsiveBannerPreviewProps) {
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const { desktop, mobile } = getResponsiveImageUrls(banner, baseUrl);

  const currentImage = viewportMode === 'desktop' ? desktop : mobile;
  const aspectRatio = getBannerAspectRatio(viewportMode);

  // Use cssContent if available, otherwise fall back to banner.css_code
  // If loading CSS, use empty string to avoid flash of unstyled content
  const effectiveCSS = loading ? '' : (cssContent || banner.css_code || '');

  // Sanitize CSS to remove potentially harmful content
  // Remove script tags and javascript: protocol, but keep CSS syntax intact
  const sanitizedCSS = effectiveCSS
    .replace(/<script[^>]*>.*?<\/script>/gis, '') // Remove any script tags
    .replace(/javascript:/gi, ''); // Remove javascript: protocol
    // Note: @import is blocked by iframe sandbox, no need to break CSS syntax

  const processedHtml = fixImageUrlsInHtml(banner.html_code, baseUrl);

  // Escape CSS for safe injection into template literal
  const escapedCSS = sanitizedCSS.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${');

  const iframeContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        ${baseUrl ? `<base href="${baseUrl}">` : ''}
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow: hidden;
          }
          body {
            ${currentImage ? `
            background-image: url('${currentImage}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            ` : 'background-color: #f3f4f6;'}
          }
          /* Only hide images if they would conflict with background image */
          ${currentImage ? `
          picture, img {
            visibility: hidden;
          }
          ` : ''}
          ${escapedCSS}
        </style>
      </head>
      <body>
        ${processedHtml}
        <script>
          // Error handler for the iframe
          window.addEventListener('error', function(e) {
            console.error('Banner preview error:', e.message);
          });

          // Log CSS loading issues
          console.log('Banner preview loaded with', ${effectiveCSS.length}, 'characters of CSS');
        </script>
      </body>
    </html>
  `;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled>
              <Monitor className="w-4 h-4" />
              Desktop
            </Button>
            <Button variant="secondary" size="sm" disabled>
              <Smartphone className="w-4 h-4" />
              Mobile
            </Button>
          </div>
        </div>
        <div className="border border-gray-200 rounded bg-gray-50 flex items-center justify-center" style={{ aspectRatio }}>
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <div className="text-sm text-gray-500">Loading CSS styles...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Live Preview</h3>
        <div className="flex gap-2">
          <Button
            variant={viewportMode === 'desktop' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewportMode('desktop')}
          >
            <Monitor className="w-4 h-4" />
            Desktop
          </Button>
          <Button
            variant={viewportMode === 'mobile' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewportMode('mobile')}
          >
            <Smartphone className="w-4 h-4" />
            Mobile
          </Button>
        </div>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden bg-white">
        <div className="relative w-full" style={{ aspectRatio }}>
          <iframe
            srcDoc={iframeContent}
            className="w-full h-full border-0"
            sandbox="allow-same-origin allow-scripts"
            title={`${banner.title} - ${viewportMode} preview`}
            style={{ display: 'block' }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Viewport: {viewportMode === 'desktop' ? '1920 × 720' : '720 × 960'}
        </span>
        {currentImage && (
          <span className="text-gray-400">Displaying static image</span>
        )}
      </div>
    </div>
  );
}
