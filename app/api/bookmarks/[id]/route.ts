import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(req: Request, context: RouteContext) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  // Delete the bookmark (only if owned by user)
  const { data, error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if a row was actually deleted
  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Bookmark not found or already deleted" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: Request, context: RouteContext) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));

  if (!body.title || typeof body.title !== "string") {
    return NextResponse.json(
      { error: "Title is required" },
      { status: 400 }
    );
  }

  // Update the bookmark title (only if owned by user)
  const { data, error } = await supabase
    .from("bookmarks")
    .update({ title: body.title.trim() })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id,url,title,description,site_name,image_url,notes,created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json(
      { error: "Bookmark not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ bookmark: data });
}
