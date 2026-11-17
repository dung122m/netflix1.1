import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 5;

export async function POST(_req?: NextRequest) {
  // Tracking disabled to save serverless invocations and Supabase database IOPS
  return NextResponse.json({ success: true, tracking: "disabled" });
}

export async function GET(_req?: NextRequest) {
  return NextResponse.json({ success: true, tracking: "disabled" });
}
