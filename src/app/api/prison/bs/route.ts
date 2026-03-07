import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireTier7 } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Boot sequence lines — served from the server so "Press B" hint
// is never visible in the client JS bundle.
const BOOT_LINES: { delay: number; text: string; dim?: boolean }[] = [
  { delay: 800, text: "American Megatrends BIOS v3.31" },
  { delay: 1200, text: "(C) 1983-1997 American Megatrends Inc." },
  { delay: 1400, text: "" },
  { delay: 1600, text: "Pentium(R) Processor 166MHz" },
  { delay: 2000, text: "Memory Test: 640K OK" },
  { delay: 2400, text: "Extended Memory: 15360K OK" },
  { delay: 2800, text: "" },
  { delay: 3000, text: "Detecting IDE drives..." },
  { delay: 3500, text: "  Press B for boot device menu", dim: true },
  { delay: 3800, text: "  Primary Master: QUANTUM FIREBALL 1.2GB (D:)" },
  { delay: 4200, text: "  Primary Slave:  MAXTOR 7120AT 120MB (C:)" },
  { delay: 4800, text: "" },
  { delay: 5000, text: "Booting from Primary Master: D:\\" },
  { delay: 5600, text: "HIMEM.SYS loaded" },
  { delay: 6000, text: "EMM386.EXE loaded" },
  { delay: 6400, text: "MSCDEX.EXE v2.25 installed" },
  { delay: 7000, text: "" },
  { delay: 7200, text: "D:\\>autoexec" },
  { delay: 7600, text: "D:\\>prison.exe" },
  { delay: 8000, text: "" },
  { delay: 8200, text: "Loading..." },
  { delay: 8600, text: "\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 100%" },
];

// The text of the boot-menu hint line (used by client to know which
// line to remove after the boot window closes).
const BOOT_HINT_TEXT = "  Press B for boot device menu";

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { participantId, eventId } = auth;

  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  // No modem requirement — boot sequence happens before modem is activated
  return NextResponse.json({
    bootLines: BOOT_LINES,
    bootHintText: BOOT_HINT_TEXT,
  });
}
