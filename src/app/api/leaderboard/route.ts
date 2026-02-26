import { NextRequest } from "next/server";
import { db } from "@/db";
import { participants, events } from "@/db/schema";
import { eq } from "drizzle-orm";
import { sseBroadcaster } from "@/lib/sse";
import { nanoid } from "nanoid";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const eventId = req.nextUrl.searchParams.get("eventId");

  if (!eventId) {
    return new Response("eventId is required", { status: 400 });
  }

  const event = db
    .select()
    .from(events)
    .where(eq(events.id, eventId))
    .get();

  const clientId = nanoid();

  const stream = new ReadableStream({
    start(controller) {
      sseBroadcaster.addClient(clientId, controller);

      // Send initial leaderboard
      const leaderboard = db
        .select({
          id: participants.id,
          name: participants.name,
          totalPoints: participants.totalPoints,
        })
        .from(participants)
        .where(eq(participants.eventId, eventId))
        .orderBy(participants.totalPoints)
        .all()
        .reverse();

      const data = JSON.stringify({
        leaderboard,
        event: event
          ? { name: event.name, endsAt: event.endsAt }
          : null,
      });
      controller.enqueue(
        new TextEncoder().encode(`event: init\ndata: ${data}\n\n`)
      );
    },
    cancel() {
      sseBroadcaster.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
