import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { requireAuth } from "@/lib/auth";
import { getParticipantTierStatus } from "@/lib/tiers";
import { bundleToZip } from "@/lib/zip";
import { db } from "@/db";
import { challenges } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ challengeNumber: string }> }
) {
  try {
    const authResult = requireAuth(req);
    if (authResult instanceof NextResponse) return authResult;

    const { participantId, eventId } = authResult;
    const { challengeNumber } = await params;

    const num = parseInt(challengeNumber, 10);
    if (isNaN(num) || num < 1 || num > 99) {
      return NextResponse.json(
        { error: "Invalid challenge number" },
        { status: 400 }
      );
    }

    // Look up the challenge by sortOrder to get its tier
    const [challenge] = await db
      .select({ id: challenges.id, tier: challenges.tier, title: challenges.title })
      .from(challenges)
      .where(
        and(eq(challenges.eventId, eventId), eq(challenges.sortOrder, num))
      )
      .all();

    if (!challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 }
      );
    }

    // Check tier unlock status
    const tierStatus = await getParticipantTierStatus(participantId, eventId);
    if (challenge.tier > tierStatus.maxTier) {
      return NextResponse.json(
        { error: "Challenge locked. Complete earlier tiers first." },
        { status: 403 }
      );
    }

    // Read the bundle file
    const bundlePath = join(process.cwd(), "data", "starter-bundles", `ch${num}.json`);
    if (!existsSync(bundlePath)) {
      return NextResponse.json(
        { error: "Starter bundle not found" },
        { status: 404 }
      );
    }

    const bundleJson = readFileSync(bundlePath, "utf-8");
    const bundle = JSON.parse(bundleJson);

    // Check format parameter
    const format = req.nextUrl.searchParams.get("format") || "json";

    if (format === "zip") {
      const zipBuffer = await bundleToZip(bundle);
      return new NextResponse(new Uint8Array(zipBuffer), {
        status: 200,
        headers: {
          "Content-Type": "application/zip",
          "Content-Disposition": `attachment; filename="challenge-${num}-starter.zip"`,
        },
      });
    }

    // Default: return JSON
    return NextResponse.json(bundle);
  } catch (error) {
    console.error("GET /api/starter error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
