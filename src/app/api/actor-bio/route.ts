import { NextRequest, NextResponse } from "next/server";
import { fetchActorProfile } from "@/services/wikipediaService";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const profile = await fetchActorProfile(name);
    return NextResponse.json(profile || { name, notFound: true }, {
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=43200",
      },
    });
  } catch (error) {
    console.error("Actor bio API error:", error);
    return NextResponse.json({ error: "Failed to fetch actor profile" }, { status: 500 });
  }
}
