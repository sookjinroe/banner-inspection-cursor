import html2canvas from 'html2canvas';

export async function captureBannerImage(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Failed to create blob from canvas'));
      }
    }, 'image/png');
  });
}

export function createIframeRenderer(htmlCode: string, cssCode: string): string {
  const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    ${cssCode}
  </style>
</head>
<body>
  ${htmlCode}
</body>
</html>
  `;

  return fullHtml;
}
