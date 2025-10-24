import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';

export function useCSSLoader(cssFileUrl?: string) {
  const [cssContent, setCssContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<Map<string, string>>(new Map());
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3;

  useEffect(() => {
    if (!cssFileUrl) {
      setCssContent('');
      setLoading(false);
      setError(null);
      return;
    }

    // Check cache first
    const cached = cacheRef.current.get(cssFileUrl);
    if (cached) {
      console.log(`Using cached CSS for: ${cssFileUrl}`);
      setCssContent(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function loadCSS() {
      setLoading(true);
      setError(null);

      try {
        console.log(`Loading CSS from: ${cssFileUrl}`);

        const { data, error: downloadError } = await supabase.storage
          .from('banner-assets')
          .download(cssFileUrl!);

        if (downloadError) {
          console.error('CSS download error:', downloadError);

          // Retry on network errors
          if (retryCountRef.current < maxRetries &&
              (downloadError.message.includes('network') ||
               downloadError.message.includes('timeout'))) {
            retryCountRef.current++;
            console.log(`Retrying CSS download (${retryCountRef.current}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCountRef.current));
            if (!cancelled) {
              loadCSS();
            }
            return;
          }

          throw new Error(`Failed to download CSS: ${downloadError.message}`);
        }

        if (cancelled) return;

        const text = await data.text();
        if (cancelled) return;

        // Validate CSS content
        if (!text || text.trim().length === 0) {
          console.warn('CSS file is empty');
          setCssContent('');
        } else {
          const sizeKB = (data.size / 1024).toFixed(2);
          console.log(`Successfully loaded CSS file (${sizeKB} KB)`);

          // Cache the result
          if (cssFileUrl) {
            cacheRef.current.set(cssFileUrl, text);
          }
          setCssContent(text);
        }

        // Reset retry count on success
        retryCountRef.current = 0;
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load CSS';
          const errorObj = new Error(errorMessage);
          setError(errorObj);
          console.error('CSS loading error:', errorMessage, err);
          setCssContent(''); // Clear content on error
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCSS();

    return () => {
      cancelled = true;
    };
  }, [cssFileUrl]);

  return { cssContent, loading, error };
}
