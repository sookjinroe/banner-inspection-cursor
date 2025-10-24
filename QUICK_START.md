# Quick Start Guide - Banner Inspection Feature

## Setup (One-time)

### 1. OpenAI API Key
✅ Already configured in `.env` file

### 2. Upload Approved Icons
Run this command to upload the approved icon list to Supabase storage:

```bash
node upload-approved-icons.js
```

Expected output:
```
Reading approved icons image file...
Uploading approved icons image to Supabase storage...
Successfully uploaded approved icons image: system-assets/approved-icons.jpeg
Updating system configuration...
Successfully updated system configuration

Approved icons setup complete!
```

### 3. Database Migration
✅ Already applied - the `system_config` table has been created

## Using the Inspection Feature

### Step 1: Navigate to Inspection Page
1. Open the application
2. Click on the "Inspection" tab in the navigation

### Step 2: Run Inspection
1. Find a collection result with banners
2. Click the "Inspect" button
3. Watch the console for detailed progress logs

### Step 3: View Results
1. Wait for inspection to complete (typically 5-10 seconds per banner)
2. Expand the collection to see individual banners
3. Select a banner from the left sidebar
4. Click the "Inspection" tab to see results

## Console Output

Open browser DevTools (F12) to see detailed logs:

```
[Inspection] 🚀 Starting inspection for banner: AU Home Banner 1
[Inspection] Background image URL (raw): /content/dam/au/images/banner-bg.jpg
[Inspection] ✓ Resolved background image URL: https://www.lg.com/au/...
[Inspection] Fetching approved icons configuration from database...
[Inspection] ✓ Found approved icons path: system-assets/approved-icons.jpeg
[OpenAI] 🤖 Preparing inspection request...
[OpenAI] ✓ OpenAI client initialized
[ImageUtils] �� Fetching image from URL: https://...
[ImageUtils] ✓ Image fetched successfully
[ImageUtils] Blob size: 156.78 KB
[OpenAI] 🌐 Sending request to GPT-4o API...
[OpenAI] ✓ Received response from GPT-4o (took 4523 ms)
[OpenAI] ✓ Successfully parsed JSON response
[Inspection] ✓ Successfully saved inspection result
```

## Understanding Results

### Status Indicators

- 🟢 **준수** (Compliant) - Fully meets the guideline
- 🔴 **위반** (Violation) - Does not meet the guideline
- 🟡 **부분 준수** (Partial Compliance) - Partially meets the guideline
- 🔵 **정보** (Information) - Reference information only

### Categories

**A. 텍스트 컴포넌트** (Text Components)
- Checks if text is implemented as HTML components vs images
- Validates font sizes for eyebrow, headlines, and body copy
- Verifies line limits

**B. 레이아웃 및 디자인 의도** (Layout & Design)
- Checks if background image has space for text components
- Validates HTML structure separates text and image areas

**C. 이미지 내 금지 텍스트** (Prohibited Text in Images)
- Ensures product features, promotions, and marketing copy are not in images
- Validates only disclaimers appear in images

**D. 아이콘** (Icons)
- Verifies icon count (≤3)
- Checks icon placement
- **Visually compares icons against approved list**
- Validates icon layout and separation from logos

## Troubleshooting

### "OpenAI API key not configured"
- Restart the dev server after updating `.env`

### "Approved icons image URL not configured"
- Run `node upload-approved-icons.js`

### "Failed to load background image"
- Check that the banner has `image_desktop` or `image_mobile` URL
- Verify image URL is accessible (check browser Network tab)

### Inspection takes a long time
- Normal: 5-10 seconds per banner
- Large images increase processing time
- Multiple banners are processed sequentially

## API Cost Considerations

GPT-4o pricing (as of 2024):
- Input: ~$2.50 per 1M tokens (images count as tokens)
- Output: ~$10 per 1M tokens

Typical cost per banner inspection:
- HTML text: ~500-1000 tokens
- Background image: ~1000-2000 tokens (depends on size)
- Approved icons image: ~500-1000 tokens
- Output JSON: ~500-1000 tokens
- **Estimated: $0.01-$0.03 per banner**

For a collection with 10 banners: ~$0.10-$0.30

## Next Steps

1. ✅ Upload approved icons: `node upload-approved-icons.js`
2. Collect some banners from the Collection page
3. Run inspection on the collection
4. View detailed results in the Inspection tab
5. Monitor console for any issues

## Support

For detailed logging information, see `CONSOLE_LOGGING.md`
For complete setup guide, see `INSPECTION_SETUP.md`
