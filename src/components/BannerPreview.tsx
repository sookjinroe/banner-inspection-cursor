import { useMemo } from 'react';

type PreviewMode = 'desktop' | 'mobile';

interface BannerPreviewProps {
  bannerHtml: string;
  css: string;
  baseUrl: string;
  mode: PreviewMode;
}

export function BannerPreview({ bannerHtml, css, baseUrl, mode }: BannerPreviewProps) {
  const srcDoc = useMemo(() => {
    const escapedCSS = css
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/javascript:/gi, '');

    return `
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
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          ${escapedCSS}
        </style>
      </head>
      <body>
        ${bannerHtml}
        <script>
          window.addEventListener('error', function(e) {
            console.error('Banner preview error:', e.message);
          });
          console.log('Banner loaded with', ${css.length}, 'characters of CSS');
        </script>
      </body>
    </html>
  `;
  }, [bannerHtml, css, baseUrl, mode]);

  if (mode === 'mobile') {
    return (
      <div
        style={{ width: '375px', height: '500px', transition: 'all 0.3s ease-in-out' }}
        className="bg-white rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 shadow-2xl"
      >
        <iframe
          srcDoc={srcDoc}
          title="Banner Preview (mobile)"
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts"
        />
      </div>
    );
  }

  // Desktop: fixed size with scaled viewport
  return (
    <div
      style={{ width: '960px', height: '360px', transition: 'all 0.3s ease-in-out' }}
      className="bg-white rounded-lg overflow-hidden border border-slate-700 flex-shrink-0 shadow-2xl"
    >
      <iframe
        srcDoc={srcDoc}
        title="Banner Preview (desktop)"
        style={{ width: '1920px', height: '720px', transform: 'scale(0.5)', transformOrigin: 'top left' }}
        className="border-0"
        sandbox="allow-same-origin allow-scripts"
      />
    </div>
  );
}
