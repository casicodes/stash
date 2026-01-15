# Screenshot Storage Setup Guide

This guide walks you through setting up Supabase Storage to handle screenshot uploads for snippets.

## Overview

Screenshots from the browser extension are now uploaded to Supabase Storage instead of being stored as base64 data URLs in the database. This avoids API/body size limits and database constraints.

## Step-by-Step Setup

### 1. Create the Storage Bucket

1. Open your Supabase project dashboard
2. Navigate to **Storage** in the left sidebar
3. Click **New bucket**
4. Configure the bucket:
   - **Name**: `screenshots`
   - **Public bucket**: ✅ Enable (toggle ON)
   - **File size limit**: Leave default or set appropriate limit (e.g., 5MB)
   - **Allowed MIME types**: Leave empty (accepts all) or restrict to `image/png,image/jpeg,image/webp`
5. Click **Create bucket**

### 2. Set Up Storage Policies (RLS)

Even though the bucket is public, you should set up Row Level Security policies for better control.

1. In the Supabase dashboard, go to **Storage** → **Policies**
2. Select the `screenshots` bucket
3. Add policies:

#### Policy 1: Allow authenticated users to upload
- **Policy name**: `Allow authenticated uploads`
- **Allowed operation**: INSERT
- **Policy definition**:
  ```sql
  (bucket_id = 'screenshots'::text) AND (auth.role() = 'authenticated'::text)
  ```

#### Policy 2: Allow public read access
- **Policy name**: `Allow public reads`
- **Allowed operation**: SELECT
- **Policy definition**:
  ```sql
  (bucket_id = 'screenshots'::text)
  ```

Alternatively, you can use the SQL Editor to create policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'screenshots');

-- Allow public read access
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'screenshots');
```

### 3. Verify Environment Variables

Ensure your `.env.local` file has the required variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is used for server-side uploads and bypasses RLS policies.

### 4. Test the Setup

#### Option A: Test via Browser Extension

1. Build and install the browser extension (if not already installed)
2. Select some text on a webpage
3. Right-click and choose "Save selection"
4. The screenshot should be captured and uploaded
5. Check:
   - The bookmark is created successfully
   - The `image_url` field contains a Supabase Storage URL (not a data URL)
   - The image is accessible when you open the URL

#### Option B: Test via API Directly

1. Start your Next.js dev server: `npm run dev`
2. Make a POST request to `/api/bookmarks` with a base64 data URL:

```bash
curl -X POST http://localhost:3000/api/bookmarks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "url": "some text content",
    "image_url": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
  }'
```

Replace `YOUR_TOKEN` with a valid JWT token from your authenticated session.

### 5. Verify Uploads in Supabase

1. Go to **Storage** → **screenshots** bucket
2. You should see files organized by user ID: `{userId}/{timestamp}-{random}.{ext}`
3. Click on a file to view it
4. Copy the URL and verify it's publicly accessible

### 6. Troubleshooting

#### Issue: Upload fails with "new row violates row-level security policy"

**Solution**: Make sure you've created the INSERT policy for authenticated users (Step 2).

#### Issue: Images are uploaded but URLs return 404

**Solution**: 
- Verify the bucket is marked as **public**
- Check that the SELECT policy allows public reads
- Ensure the file path in the URL matches the uploaded file path

#### Issue: "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" error

**Solution**: 
- Check your `.env.local` file has all required variables
- Restart your Next.js dev server after adding environment variables
- Verify the variable names match exactly (no typos)

#### Issue: Upload works but image_url is null in database

**Solution**:
- Check server logs for upload errors
- Verify the base64 data URL format is correct: `data:image/{ext};base64,{data}`
- Check that the upload function is being called (add console.logs if needed)

#### Issue: Large screenshots fail to upload

**Solution**:
- Check the bucket's file size limit in Supabase dashboard
- Increase the limit if needed (default is usually 50MB)
- Consider compressing images before upload (future enhancement)

### 7. Optional: Add Image Compression (Future Enhancement)

For better performance, you could compress images before upload:

1. Install an image compression library
2. Compress the base64 image in the browser extension before sending
3. Or compress server-side before uploading to storage

### 8. Cleanup (Optional)

If you want to clean up old base64 data URLs from existing bookmarks:

```sql
-- Find bookmarks with data URLs (for reference)
SELECT id, image_url 
FROM bookmarks 
WHERE image_url LIKE 'data:image/%'
LIMIT 10;

-- Note: You'd need to migrate these by re-uploading if needed
-- This is a one-time migration task if you have existing data
```

## File Structure

The implementation consists of:

- **`lib/storage/upload.ts`**: Utility function to upload base64 images to Supabase Storage
- **`app/api/bookmarks/route.ts`**: Updated POST handler that detects base64 data URLs and uploads them

## How It Works

1. Extension captures screenshot as base64 data URL
2. Extension sends bookmark with `image_url` containing the data URL
3. API route detects `data:image/` prefix
4. Server uploads image to Supabase Storage using service role key
5. Server gets public URL from storage
6. Server saves public URL to database instead of base64 string
7. Frontend displays image using the public URL

This approach:
- ✅ Avoids API body size limits
- ✅ Avoids database size constraints
- ✅ Provides faster page loads (images served from CDN)
- ✅ Scales better for storage
- ✅ Allows image optimization/CDN caching
