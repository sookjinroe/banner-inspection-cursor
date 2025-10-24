export async function fetchImageAsBase64(imageUrl: string): Promise<string> {
  console.log('[ImageUtils] 📷 Fetching image from URL:', imageUrl);

  try {
    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error('[ImageUtils] ❌ HTTP error:', response.status, response.statusText);
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    console.log('[ImageUtils] ✓ Image fetched successfully');
    console.log('[ImageUtils] Content-Type:', response.headers.get('content-type'));

    const blob = await response.blob();
    console.log('[ImageUtils] Blob size:', (blob.size / 1024).toFixed(2), 'KB');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        console.log('[ImageUtils] ✓ Converted to Base64 (length:', base64String.length, ')');
        resolve(base64String);
      };
      reader.onerror = () => {
        console.error('[ImageUtils] ❌ FileReader error');
        reject(new Error('Failed to convert image to Base64'));
      };
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[ImageUtils] ❌ Error fetching image as Base64:', error);
    throw error;
  }
}

export async function getImageMimeType(imageUrl: string): Promise<string> {
  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    const contentType = response.headers.get('content-type');
    return contentType || 'image/png';
  } catch (error) {
    console.warn('Failed to detect image MIME type, defaulting to image/png');
    return 'image/png';
  }
}

export function validateImageUrl(url: string | undefined | null): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url, window.location.origin);
    const path = urlObj.pathname.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

    return validExtensions.some(ext => path.endsWith(ext)) || path.includes('/content/');
  } catch {
    return false;
  }
}
