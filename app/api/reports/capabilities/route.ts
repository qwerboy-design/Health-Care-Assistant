import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
export async function GET() {
  return NextResponse.json({ enabled: process.env.ENABLE_HEALTH_REPORT_ASSISTANT === 'true', version: '0.2' }, { headers: { 'Cache-Control': 'no-store' } });
}
