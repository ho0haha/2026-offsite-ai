import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireModem, requireTier7 } from "@/lib/auth";

export const dynamic = "force-dynamic";

// DOS filesystem served from the server to avoid client-side leakage
const FS_DATA = {
  volumeLabel: "FALKEN",
  serialNumber: "0607-1983",
  entries: [
    { type: "file", name: "AUTOEXEC.BAT", size: 42, date: "03-15-97  12:00a", content: "@ECHO OFF\nD:\\PRISON.EXE" },
    { type: "file", name: "CONFIG.SYS", size: 128, date: "03-15-97  12:00a", content: "DEVICE=C:\\DOS\\HIMEM.SYS\nDEVICE=C:\\DOS\\EMM386.EXE\nFILES=40\nBUFFERS=20" },
    { type: "dir", name: "DOS", date: "03-15-97  12:00a", children: [
      { type: "file", name: "HIMEM.SYS", size: 29136, date: "09-30-93  06:20a", content: "\x00\x00\x00HIMEM\x00\x00v3.10\x00\x00XMS DRIVER\x00\x00(binary)" },
      { type: "file", name: "EMM386.EXE", size: 120926, date: "09-30-93  06:20a", content: "\x00\x00EMM386\x00EXPANDED MEMORY MANAGER\x00v4.49\x00\x00(binary)" },
      { type: "file", name: "EDIT.COM", size: 413, date: "09-30-93  06:20a" },
      { type: "file", name: "FORMAT.COM", size: 22974, date: "09-30-93  06:20a" },
      { type: "file", name: "MSCDEX.EXE", size: 25377, date: "09-30-93  06:20a", content: "\x00MSCDEX\x00CD-ROM EXTENSIONS\x00v2.25\x00\x00(binary)" },
    ]},
    { type: "dir", name: "USERS", date: "06-07-83  03:14a", children: [
      { type: "dir", name: "SFALKEN", date: "06-07-83  03:14a", children: [
        { type: "dir", name: "RESEARCH", date: "06-07-83  03:14a", children: [
          { type: "file", name: "MAZE.DAT", size: 8192, date: "06-07-83  03:14a", content: "####S#######\n#  #   #   #\n# ## # # # #\n#    # # # #\n###### # # #\n#      # # #\n# ###### # #\n#        # #\n# ######## #\n#          #\n######E#####" },
          { type: "file", name: "LEARNING.LOG", size: 34201, date: "06-07-83  03:14a", content: "ITERATION 4,291,003\nGAME: TIC-TAC-TOE\nRESULT: DRAW\nCONCLUSION: NO WINNING STRATEGY EXISTS\n\n... EXTRAPOLATING TO FULL THEATER SIMULATION ..." },
        ]},
        { type: "dir", name: "PROJECT", date: "06-07-83  03:14a", children: [
          { type: "file", name: "JOSHUA.EXE", size: 512000, date: "06-07-83  03:14a" },
        ]},
      ]},
    ]},
    { type: "dir", name: "TEMP", date: "03-15-97  12:00a", children: [] },
  ],
  // File list for disk wipe animation
  wipeFiles: [
    "AUTOEXEC.BAT", "CONFIG.SYS", "DOS\\HIMEM.SYS", "DOS\\EMM386.EXE",
    "DOS\\EDIT.COM", "DOS\\FORMAT.COM", "DOS\\MSCDEX.EXE",
    "USERS\\SFALKEN\\RESEARCH\\MAZE.DAT", "USERS\\SFALKEN\\RESEARCH\\LEARNING.LOG",
    "USERS\\SFALKEN\\PROJECT\\JOSHUA.EXE",
  ],
};

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { participantId, eventId } = auth;

  const tierCheck = await requireTier7(participantId, eventId);
  if (tierCheck) return tierCheck;

  const modemCheck = await requireModem(participantId);
  if (modemCheck) return modemCheck;

  return NextResponse.json(FS_DATA);
}
