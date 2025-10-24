import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { DOMParser } from "jsr:@b-fuze/deno-dom";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BannerData {
  dataTitle: string;
  bannerHtml: string;
  imageDesktop: string;
  imageMobile: string;
}

interface CrawlResult {
  banners: BannerData[];
  css: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }

    const html = await response.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    if (!doc) {
      throw new Error("Failed to parse HTML");
    }

    const carouselItems = doc.querySelectorAll("div.cmp-carousel__item");
    const banners: BannerData[] = [];

    carouselItems.forEach((item: any) => {
      const dataTitle = item.getAttribute("data-title") || "";

      const container = item.querySelector("div.cmp-container");
      if (!container) return;

      const bannerHtml = item.outerHTML;

      let imageDesktop = "";
      let imageMobile = "";

      const picture = container.querySelector("picture");
      if (picture) {
        const sources = picture.querySelectorAll("source");
        sources.forEach((source: any) => {
          const media = source.getAttribute("media") || "";
          const srcset = source.getAttribute("srcset") || "";

          if (media.includes("min-width: 769px")) {
            imageDesktop = resolveUrl(srcset, url);
          } else if (media.includes("max-width: 768px")) {
            imageMobile = resolveUrl(srcset, url);
          }
        });
      }

      banners.push({
        dataTitle,
        bannerHtml,
        imageDesktop,
        imageMobile,
      });
    });

    const cssUrls = extractCssUrls(html, url);
    const externalCss = await collectCss(cssUrls);
    const inlineCss = extractInlineStyles(html);

    const css = [externalCss, inlineCss].filter(Boolean).join('\n\n');

    const result: CrawlResult = {
      banners,
      css,
    };

    return new Response(JSON.stringify(result), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Crawl error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function resolveUrl(url: string, baseUrl: string): string {
  if (!url) return "";

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  const base = new URL(baseUrl);

  if (url.startsWith("//")) {
    return `${base.protocol}${url}`;
  }

  if (url.startsWith("/")) {
    return `${base.origin}${url}`;
  }

  return new URL(url, baseUrl).href;
}

function extractCssUrls(html: string, baseUrl: string): string[] {
  const cssUrls: string[] = [];
  const linkRegex = /<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi;
  const styleRegex = /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']stylesheet["'][^>]*>/gi;

  let match;

  while ((match = linkRegex.exec(html)) !== null) {
    const resolved = resolveUrl(match[1], baseUrl);
    if (!cssUrls.includes(resolved)) {
      cssUrls.push(resolved);
    }
  }

  linkRegex.lastIndex = 0;

  while ((match = styleRegex.exec(html)) !== null) {
    const href = match[1];
    const resolved = resolveUrl(href, baseUrl);
    if (!cssUrls.includes(resolved)) {
      cssUrls.push(resolved);
    }
  }

  return cssUrls;
}

function extractInlineStyles(html: string): string {
  const inlineStyles: string[] = [];
  const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  let match;
  while ((match = styleTagRegex.exec(html)) !== null) {
    const styleContent = match[1].trim();
    if (styleContent) {
      inlineStyles.push(styleContent);
    }
  }

  if (inlineStyles.length === 0) {
    return '';
  }

  return `/* Inline Styles */\n${inlineStyles.join('\n\n')}`;
}

async function collectCss(cssUrls: string[]): Promise<string> {
  const cssContents: string[] = [];
  const maxRetries = 2;
  const timeout = 10000;

  for (const url of cssUrls) {
    let retries = 0;
    let success = false;

    while (retries < maxRetries && !success) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const css = await response.text();
          cssContents.push(`/* Source: ${url} */\n${css}\n`);
          success = true;
          console.log(`Successfully fetched CSS from ${url}`);
        } else {
          console.warn(`Failed to fetch CSS from ${url}: ${response.status} ${response.statusText}`);
          retries++;
        }
      } catch (error) {
        retries++;
        if (retries >= maxRetries) {
          console.error(`Failed to fetch CSS from ${url} after ${maxRetries} attempts:`, error);
        } else {
          console.warn(`Retrying CSS fetch from ${url} (attempt ${retries + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
  }

  if (cssContents.length === 0) {
    console.warn("No CSS files were successfully collected");
    return '';
  }

  console.log(`Successfully collected ${cssContents.length} CSS files from ${cssUrls.length} URLs`);
  return cssContents.join("\n");
}
