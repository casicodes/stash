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
