# Banner Inspection Feature Setup Guide

This guide explains how to set up and use the new GPT-4o multimodal banner inspection feature.

## Overview

The banner inspection feature uses OpenAI's GPT-4o model to analyze web banners against a comprehensive set of guidelines. It performs visual analysis of banner background images and compares icons against an approved list.

## Prerequisites

1. OpenAI API key with GPT-4o access
2. Supabase project with database and storage configured
3. Node.js environment with npm

## Setup Steps

### 1. Configure OpenAI API Key

Add your OpenAI API key to the `.env` file:

```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Apply Database Migration

The database schema has been updated with a new `system_config` table for storing system settings.

Migration has already been applied automatically. It includes:
- `system_config` table for storing approved icon list URL
- Updated `inspection_results` structure to support new inspection format

### 3. Upload Approved Icons Image

Run the upload script to store the approved icon list in Supabase storage:

```bash
node upload-approved-icons.js
```

This script:
- Uploads `public/Value Prop icon.jpg.jpeg` to Supabase storage at `system-assets/approved-icons.jpeg`
- Updates the `system_config` table with the image path

## Inspection Process

### How It Works

1. **User Initiates Inspection**: Click the "Inspect" button on a collection result
2. **For Each Banner**:
   - Fetch the banner's background image URL (image_desktop or image_mobile)
   - Fetch the approved icon list image URL from Supabase storage
   - Validate that both image URLs are publicly accessible
   - Send image URLs directly to GPT-4o API with HTML code and inspection prompt
   - Parse the JSON response with inspection results
   - Save results to database

3. **Display Results**: View categorized inspection results in the Inspection tab

**Note**: The inspection uses OpenAI's recommended URL method for passing images, which provides significant performance benefits:
- Saves 100,000+ tokens per inspection compared to Base64 encoding
- Faster API response times
- Lower API costs
- More efficient network transmission

### Inspection Categories

The inspection checks are organized into 4 categories:

#### A. 텍스트 컴포넌트 (Text Components)
- A1: Headlines/body copy as text components (not in images)
- A2: Eyebrow font size compliance (PC: 20pt / Mobile: 16pt)
- A3: Head Copy font size compliance (PC: 56pt / Mobile: 28pt)
- A4: Body Copy font size compliance (PC: 16pt / Mobile: 16pt)
- A5: Head Copy line limit (max 3 lines recommended)

#### B. 레이아웃 및 디자인 의도 (Layout and Design Intent)
- B1: Clear space for text components in background image
- B2: HTML structure separates text and image areas
- B-Ref: Reference note about final layout verification

#### C. 이미지 내 금지 텍스트 (Prohibited Text in Images)
- C1: Product USP/features/options info
- C2: Promotion details (discounts/amounts/gifts)
- C3: Membership/benefits details
- C4: Marketing copy/headlines
- C-Ref: Disclaimer text at bottom is allowed

#### D. 아이콘 (Icons)
- D1: Icon count (3 or fewer)
- D2: Icons placed in designated area (bottom)
- D3: Only approved icons used (visual comparison with icon list)
- D4: Icon layout compliance (icon left, text right)
- D5: No mixing of logos and icons in icon area

### Status Values

Each inspection check returns one of four status values:

- **준수** (Compliant) - Green badge: Requirement fully met
- **위반** (Violation) - Red badge: Requirement not met
- **부분 준수** (Partial Compliance) - Yellow badge: Requirement partially met
- **정보** (Information) - Blue badge: Reference information only

## API Usage

### inspectBanner Function

```typescript
import { inspectBanner } from './services/openai';

const result = await inspectBanner(
  htmlCode,              // Banner HTML code
  backgroundImageUrl,    // Full URL to background image
  approvedIconsImageUrl  // Full URL to approved icons image
);

// Result format:
{
  inspectionResult: [
    {
      category: "A. 텍스트 컴포넌트",
      itemCode: "A1",
      description: "헤드라인/바디카피가 텍스트 컴포넌트로 입력됨",
      status: "준수",
      comment: "상세 설명..."
    }
  ]
}
```

### High-Level Inspection Service

```typescript
import { inspectBannerWithImages, saveInspectionResult } from './services/inspection';

// Automatically fetches approved icons URL and resolves image URLs
const checks = await inspectBannerWithImages(banner, baseUrl);

// Save results to database
await saveInspectionResult(banner.id, checks);
```

## File Structure

### New Files Created

- `src/utils/imageUtils.ts` - Image validation and utility functions (Base64 conversion no longer used)
- `src/services/inspection.ts` - High-level inspection service functions
- `src/components/InspectionChecksDisplay.tsx` - UI component for displaying categorized inspection results
- `upload-approved-icons.js` - Script to upload approved icon list to storage

### Modified Files

- `src/services/openai.ts` - Updated inspectBanner function to use URL method (recommended by OpenAI)
- `src/types/index.ts` - Updated inspection result types
- `src/pages/InspectionPage.tsx` - Updated to use new inspection service
- `supabase/migrations/` - New migration for system_config table

## Troubleshooting

### "OpenAI API key not configured"
- Ensure `VITE_OPENAI_API_KEY` is set in `.env` file
- Restart the development server after adding the key

### "Background image URL is not accessible" or "Approved icons URL is not accessible"
- Check that banner has `image_desktop` or `image_mobile` URL
- Verify the image URL is publicly accessible (the app validates URLs before sending to OpenAI)
- Ensure Supabase storage bucket `banner-assets` has public read access enabled
- Check network connectivity
- For approved icons: Run `node upload-approved-icons.js` to upload the icon list
- Verify `system_config` table has the `approved_icons_image_url` entry

### CORS Issues with OpenAI
- Supabase storage public URLs should work directly with OpenAI's API
- If you encounter CORS errors, verify your Supabase project allows requests from OpenAI's servers
- The app validates URL accessibility before sending to OpenAI to catch issues early

### "Failed to parse inspection result"
- Check OpenAI API response in console logs
- Verify the model returned valid JSON
- May need to increase `max_tokens` if response is truncated

## Cost Considerations

GPT-4o API costs:
- Input: Images passed via URL consume significantly fewer tokens than Base64 (~100,000+ token savings per inspection)
- Output: JSON response with inspection results
- URL method cost: ~$0.003825 per image vs much higher for Base64

Recommendations:
- The app uses the URL method by default (OpenAI's recommended approach)
- Use appropriately sized images (not excessively large)
- Monitor API usage in OpenAI dashboard
- Consider batch processing during off-peak hours
- Implement rate limiting if needed
- URL method provides better performance and cost efficiency

## Future Enhancements

Potential improvements:
- Caching inspection results to avoid re-inspecting unchanged banners
- Bulk inspection with progress tracking
- Custom inspection guidelines per country/region
- Export inspection reports to PDF/Excel
- Historical inspection trend analysis
