import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const choice = searchParams.get("choice");

  if (!id || !choice) {
    return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
  }

  const responseText =
    choice === "yes" ? "Lanjut Reparasi" : "Selesai / Tanpa Perbaikan";

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Check if already responded
  const { data: existing } = await supabase
    .from("bookings")
    .select("customer_checkup_response")
    .eq("id", id)
    .single();

  if (existing?.customer_checkup_response) {
    // Already responded, redirect to thank you with already-responded flag
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://scorpionautoworks.my.id";
    return NextResponse.redirect(
      `${baseUrl}/checkup-thank-you?already=true`,
      { status: 302 }
    );
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      customer_checkup_response: responseText,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[checkup-response] DB update error:", error);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://scorpionautoworks.my.id";
  return NextResponse.redirect(
    `${baseUrl}/checkup-thank-you?choice=${choice}`,
    { status: 302 }
  );
}
