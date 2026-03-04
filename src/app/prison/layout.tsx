import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "@/lib/crypto";
import { getParticipantTierStatus } from "@/lib/tiers";

export default async function PrisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get("ctf-session")?.value;

  if (!token) {
    redirect("/");
  }

  const session = verifySessionToken(token);
  if (!session) {
    redirect("/");
  }

  const tierStatus = await getParticipantTierStatus(
    session.participantId,
    session.eventId
  );

  if (tierStatus.maxTier < 7) {
    redirect("/challenges");
  }

  return <>{children}</>;
}
