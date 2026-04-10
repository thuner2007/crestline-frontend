import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query || query.length < 3) {
    return NextResponse.json([]);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=ch&q=${encodeURIComponent(
        query
      )}`,
      {
        headers: {
          'User-Agent': 'RevSticks-App (https://revsticks.ch)',
        },
      }
    );

    if (!response.ok) {
      console.error('Nominatim API error:', response.status);
      return NextResponse.json([], { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Address search error:', error);
    return NextResponse.json(
      { error: 'Failed to search addresses' },
      { status: 500 }
    );
  }
}
