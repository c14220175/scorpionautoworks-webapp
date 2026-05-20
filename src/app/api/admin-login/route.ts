import { NextRequest, NextResponse } from "next/server";

// Credentials disimpan di server-side agar tidak terexpose di client bundle
const ADMIN_USERNAME = "ScorpionAdmin";
const ADMIN_PASSWORD = "WhaityScorpion123";

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username dan password harus diisi." },
        { status: 400 }
      );
    }

    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      return NextResponse.json(
        { success: false, message: "Username atau password salah." },
        { status: 401 }
      );
    }

    // Generate simple session token (timestamp + random)
    const token = `scorpion_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    return NextResponse.json({
      success: true,
      message: "Login berhasil! Selamat datang, Admin.",
      token,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
