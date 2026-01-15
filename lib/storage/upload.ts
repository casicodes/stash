import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "screenshots";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false
    }
  });
}

export async function uploadScreenshot(dataUrl: string, userId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const base64Match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!base64Match) {
      console.error("Shelf: Invalid base64 data URL format");
      return null;
    }

    const [, ext, base64Data] = base64Match;
    const buffer = Buffer.from(base64Data, "base64");
    const fileExt = ext === "jpeg" ? "jpg" : ext;
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(fileName, buffer, {
        contentType: `image/${ext}`,
        upsert: false
      });

    if (error) {
      console.error("Shelf: Failed to upload screenshot", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Shelf: Error uploading screenshot", error);
    return null;
  }
}
