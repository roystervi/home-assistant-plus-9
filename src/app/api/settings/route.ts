import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // Redirect to new global-settings endpoint
  const url = new URL('/api/global-settings', request.url);
  return NextResponse.redirect(url, 301);
}

export async function POST(request: NextRequest) {
  // Redirect to new global-settings endpoint
  const url = new URL('/api/global-settings', request.url);
  return NextResponse.redirect(url, 307); // 307 preserves POST method and body
}