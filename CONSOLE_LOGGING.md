# Console Logging Guide

This document describes all the console messages you'll see when running the banner inspection feature.

## Console Message Categories

All messages are prefixed with their source module for easy filtering:
- `[Inspection]` - High-level inspection orchestration
- `[OpenAI]` - OpenAI API communication
- `[ImageUtils]` - Image fetching and Base64 conversion

## Inspection Flow Console Output

When you click the "Inspect" button on a collection, you'll see the following sequence of messages:

### 1. Inspection Start
```
[Inspection] 🚀 Starting inspection for banner: <banner_title>
[Inspection] Background image URL (raw): <image_url>
[Inspection] ✓ Resolved background image URL: <resolved_url>
```

### 2. Approved Icons Loading
```
[Inspection] Fetching approved icons configuration from database...
[Inspection] ✓ Found approved icons path: system-assets/approved-icons.jpeg
[Inspection] ✓ Generated public URL: <supabase_storage_url>
```

### 3. API Request Preparation
```
[Inspection] 📤 Sending request to GPT-4o API...
[Inspection] HTML code length: <num> characters
[Inspection] Background image URL: <url>
[Inspection] Approved icons URL: <url>
```

### 4. OpenAI API Processing
```
[OpenAI] 🤖 Preparing inspection request...
[OpenAI] ✓ OpenAI client initialized
```

### 5. Background Image Conversion
```
[OpenAI] 📥 Fetching and converting background image to Base64...
[ImageUtils] 📷 Fetching image from URL: <url>
[ImageUtils] ✓ Image fetched successfully
[ImageUtils] Content-Type: image/jpeg
[ImageUtils] Blob size: 123.45 KB
[ImageUtils] ✓ Converted to Base64 (length: 123456 )
[OpenAI] ✓ Background image converted to Base64 (length: 123456 )
```

### 6. Approved Icons Conversion
```
[OpenAI] 📥 Fetching and converting approved icons image to Base64...
[ImageUtils] 📷 Fetching image from URL: <url>
[ImageUtils] ✓ Image fetched successfully
[ImageUtils] Content-Type: image/jpeg
[ImageUtils] Blob size: 45.67 KB
[ImageUtils] ✓ Converted to Base64 (length: 67890 )
[OpenAI] ✓ Approved icons image converted to Base64 (length: 67890 )
```

### 7. API Request
```
[OpenAI] 🌐 Sending request to GPT-4o API...
[OpenAI] Model: gpt-4o
[OpenAI] Max tokens: 4096
[OpenAI] Temperature: 0.1
[OpenAI] Response format: json_object
```

### 8. API Response
```
[OpenAI] ✓ Received response from GPT-4o (took 5432 ms)
[OpenAI] Response length: 2345 characters
[OpenAI] Response preview: {"inspectionResult":[{"category":"A. 텍스트 컴포넌트","itemCode":"A1"...
[OpenAI] ✓ Successfully parsed JSON response
[OpenAI] Inspection result items: 15
```

### 9. Results Processing
```
[Inspection] ✓ Received response from GPT-4o
[Inspection] Number of checks returned: 15
```

### 10. Saving to Database
```
[Inspection] 💾 Saving inspection result to database for banner: <banner_id>
[Inspection] ✓ Successfully saved inspection result
```

### 11. Completion
```
Inspection complete for <banner_title>: 12/15 passed
```

## Error Messages

### OpenAI API Key Missing
```
[OpenAI] ❌ OpenAI client not initialized - API key missing
Error: OpenAI API key not configured
```
**Solution**: Add `VITE_OPENAI_API_KEY` to `.env` file

### Image Fetch Failed
```
[ImageUtils] ❌ HTTP error: 404 Not Found
[OpenAI] ❌ Failed to fetch background image: Error: Failed to fetch image: 404 Not Found
```
**Solution**: Check that the image URL is valid and accessible

### Approved Icons Not Configured
```
[Inspection] ❌ Approved icons image URL not found in system_config
Error: Approved icons image URL not configured
```
**Solution**: Run `node upload-approved-icons.js`

### JSON Parse Error
```
[OpenAI] ❌ Failed to parse JSON response: SyntaxError: Unexpected token
[OpenAI] Raw response: <response_text>
```
**Solution**: Check OpenAI response format, may need to adjust max_tokens

### Database Save Error
```
[Inspection] ❌ Failed to save inspection result: <error_message>
```
**Solution**: Check Supabase connection and table permissions

## Filtering Console Output

To filter console messages in Chrome DevTools:

1. **Show only inspection messages**: Filter by `[Inspection]`
2. **Show only API messages**: Filter by `[OpenAI]`
3. **Show only image processing**: Filter by `[ImageUtils]`
4. **Show only errors**: Filter by `❌`
5. **Show only success**: Filter by `✓`

## Performance Monitoring

Key timing metrics to watch:

- **Image fetch time**: Check ImageUtils messages for HTTP request duration
- **Base64 conversion time**: Usually instant, but large images may take longer
- **API response time**: Look for "took X ms" in OpenAI messages
  - Typical: 3000-8000ms
  - Slow: >10000ms (check internet connection)
- **Total inspection time**: From "Starting inspection" to "Successfully saved"

## Troubleshooting Tips

### If inspection hangs at "Fetching and converting image":
- Check browser console for CORS errors
- Verify image URL is accessible
- Check network tab for failed requests

### If API request takes very long:
- Large images increase processing time
- Check OpenAI API status
- Verify internet connection speed

### If JSON parsing fails:
- Response may be truncated (increase max_tokens)
- GPT-4o may have returned malformed JSON
- Check raw response in console for debugging

## Example Complete Console Output

```
[Inspection] 🚀 Starting inspection for banner: AU Home Banner 1
[Inspection] Background image URL (raw): /content/dam/au/images/banner-bg.jpg
[Inspection] ✓ Resolved background image URL: https://www.lg.com/au/content/dam/au/images/banner-bg.jpg
[Inspection] Fetching approved icons configuration from database...
[Inspection] ✓ Found approved icons path: system-assets/approved-icons.jpeg
[Inspection] ✓ Generated public URL: https://mfotyqmhbzmxhhmfojjd.supabase.co/storage/v1/object/public/banner-assets/system-assets/approved-icons.jpeg
[Inspection] 📤 Sending request to GPT-4o API...
[Inspection] HTML code length: 2847 characters
[Inspection] Background image URL: https://www.lg.com/au/content/dam/au/images/banner-bg.jpg
[Inspection] Approved icons URL: https://mfotyqmhbzmxhhmfojjd.supabase.co/storage/v1/object/public/banner-assets/system-assets/approved-icons.jpeg
[OpenAI] 🤖 Preparing inspection request...
[OpenAI] ✓ OpenAI client initialized
[OpenAI] 📥 Fetching and converting background image to Base64...
[ImageUtils] 📷 Fetching image from URL: https://www.lg.com/au/content/dam/au/images/banner-bg.jpg
[ImageUtils] ✓ Image fetched successfully
[ImageUtils] Content-Type: image/jpeg
[ImageUtils] Blob size: 156.78 KB
[ImageUtils] ✓ Converted to Base64 (length: 214567 )
[OpenAI] ✓ Background image converted to Base64 (length: 214567 )
[OpenAI] 📥 Fetching and converting approved icons image to Base64...
[ImageUtils] 📷 Fetching image from URL: https://mfotyqmhbzmxhhmfojjd.supabase.co/storage/v1/object/public/banner-assets/system-assets/approved-icons.jpeg
[ImageUtils] ✓ Image fetched successfully
[ImageUtils] Content-Type: image/jpeg
[ImageUtils] Blob size: 67.23 KB
[ImageUtils] ✓ Converted to Base64 (length: 92048 )
[OpenAI] ✓ Approved icons image converted to Base64 (length: 92048 )
[OpenAI] 🌐 Sending request to GPT-4o API...
[OpenAI] Model: gpt-4o
[OpenAI] Max tokens: 4096
[OpenAI] Temperature: 0.1
[OpenAI] Response format: json_object
[OpenAI] ✓ Received response from GPT-4o (took 4523 ms)
[OpenAI] Response length: 3456 characters
[OpenAI] Response preview: {"inspectionResult":[{"category":"A. 텍스트 컴포넌트","itemCode":"A1","description":"헤드라인/바디카피가 텍스트 컴포넌트로 입력됨","status":"준수","comment":"HTML 코드를 확인한 결과...
[OpenAI] ✓ Successfully parsed JSON response
[OpenAI] Inspection result items: 14
[Inspection] ✓ Received response from GPT-4o
[Inspection] Number of checks returned: 14
[Inspection] 💾 Saving inspection result to database for banner: 9a8b7c6d-5e4f-3g2h-1i0j-k9l8m7n6o5p4
[Inspection] ✓ Successfully saved inspection result
Inspection complete for AU Home Banner 1: 11/14 passed
```
