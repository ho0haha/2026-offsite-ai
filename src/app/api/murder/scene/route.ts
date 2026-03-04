import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { murderSessions } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import {
  SCENE_AREAS,
  MAX_SCENE_EXAMINATIONS,
  type SceneArea,
} from "@/lib/murder/constants";
import { SCENE_DESCRIPTIONS } from "@/lib/murder/characters";
import { getParticipantTierStatus } from "@/lib/tiers";

/**
 * GET /api/murder/scene
 * Returns the crime scene overview and list of examinable areas.
 */
export async function GET(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId, eventId } = authResult;

  // Require tier 5 to view crime scene
  const tierStatus = await getParticipantTierStatus(participantId, eventId);
  if (tierStatus.maxTier < 5) {
    return NextResponse.json({}, { status: 404 });
  }

  return NextResponse.json({
    overview:
      "Julian Voss's penthouse office, 47th floor, downtown Chicago. A sleek modern space — glass desk, floor-to-ceiling windows, rain streaking the glass. The body has been removed but the scene is preserved. Julian was found slumped forward at his desk at 11:47 PM. The demo night guests are being held in the adjacent rooms.",
    examinableAreas: SCENE_AREAS.map((area) => ({
      id: area,
      label: area.charAt(0).toUpperCase() + area.slice(1),
    })),
    maxExaminations: MAX_SCENE_EXAMINATIONS,
    instructions:
      "POST to this endpoint with { sessionId, examine: 'area_name' } to examine a specific area. You have 6 examinations total. Choose carefully.",
  });
}

/**
 * POST /api/murder/scene
 * Examine a specific area of the crime scene.
 * Body: { sessionId: string, examine: SceneArea }
 */
export async function POST(req: NextRequest) {
  // Auth gate
  const authResult = requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const { participantId } = authResult;

  // Parse body
  let body: { sessionId: string; examine: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { sessionId, examine } = body;
  if (!sessionId || !examine) {
    return NextResponse.json(
      { error: "sessionId and examine are required" },
      { status: 400 }
    );
  }

  // Validate area
  const area = examine.toLowerCase().trim() as SceneArea;
  if (!(SCENE_AREAS as readonly string[]).includes(area)) {
    return NextResponse.json(
      {
        error: `Unknown area '${examine}'`,
        available: [...SCENE_AREAS],
      },
      { status: 400 }
    );
  }

  // Load session
  const session = await db
    .select()
    .from(murderSessions)
    .where(
      and(
        eq(murderSessions.id, sessionId),
        eq(murderSessions.participantId, participantId)
      )
    )
    .get();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.isComplete) {
    return NextResponse.json(
      { error: "Session is already complete." },
      { status: 400 }
    );
  }

  // Parse existing examinations
  const examinations: string[] = JSON.parse(
    session.sceneExaminations || "[]"
  );

  // Check if already examined this area
  if (examinations.includes(area)) {
    // Return the description again without consuming a use
    return NextResponse.json({
      area,
      description: SCENE_DESCRIPTIONS[area],
      alreadyExamined: true,
      examinationsUsed: examinations.length,
      examinationsRemaining: MAX_SCENE_EXAMINATIONS - examinations.length,
    });
  }

  // Check examination budget
  if (examinations.length >= MAX_SCENE_EXAMINATIONS) {
    return NextResponse.json(
      {
        error: "You've used all your crime scene examinations.",
        examinationsUsed: examinations.length,
        maxExaminations: MAX_SCENE_EXAMINATIONS,
        areasExamined: examinations,
      },
      { status: 429 }
    );
  }

  // Record the examination
  examinations.push(area);
  await db
    .update(murderSessions)
    .set({ sceneExaminations: JSON.stringify(examinations) })
    .where(eq(murderSessions.id, sessionId))
    .run();

  return NextResponse.json({
    area,
    description: SCENE_DESCRIPTIONS[area],
    alreadyExamined: false,
    examinationsUsed: examinations.length,
    examinationsRemaining: MAX_SCENE_EXAMINATIONS - examinations.length,
  });
}
