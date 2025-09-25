// Full replacement for the empty/missing route
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    timestamp: Date.now() 
  });
}

export async function POST() {
  return NextResponse.json({ 
    timestamp: Date.now() 
  });
}