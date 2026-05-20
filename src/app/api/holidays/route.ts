import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get('year');

  if (!year) {
    return NextResponse.json({ error: 'Year parameter is required' }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api-hari-libur.vercel.app/api?year=${year}`, {
      // Tambahkan cache option sesuai Next.js jika diperlukan, atau biarkan default (biasanya force-cache)
      next: { revalidate: 86400 } // Cache selama 1 hari (86400 detik)
    });
    
    if (!res.ok) {
      throw new Error(`API returned status: ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to fetch holidays from external API:', error);
    return NextResponse.json({ error: 'Failed to fetch holidays' }, { status: 500 });
  }
}
