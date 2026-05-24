import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const choice = searchParams.get("choice");

  if (!id || !choice) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://scorpionautoworks.my.id";

  // Check if already responded
  const { data: existing } = await supabase
    .from("bookings")
    .select("estimation_status")
    .eq("id", id)
    .single();

  if (existing?.estimation_status === "approved" || existing?.estimation_status === "rejected") {
    // Already responded
    return NextResponse.redirect(
      `${baseUrl}/checkup-thank-you?type=estimation&already=true`,
      { status: 302 }
    );
  }

  if (choice === "yes") {
    // Approve estimation
    const { error } = await supabase
      .from("bookings")
      .update({
        estimation_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      console.error("[estimation-response] DB update error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.redirect(
      `${baseUrl}/checkup-thank-you?type=estimation&choice=yes`,
      { status: 302 }
    );
  } else {
    // Redirect to rejection form page
    return NextResponse.redirect(
      `${baseUrl}/estimation-reject?id=${id}`,
      { status: 302 }
    );
  }
}
