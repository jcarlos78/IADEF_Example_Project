import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isScaleId } from "@/lib/scales";
import { logger } from "@/server/logger";
import { store } from "@/server/rooms/instance";
import { createRoom } from "@/server/rooms/room";

const SESSION_TTL_SECONDS = 2 * 60 * 60;

function generateRoomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: { scaleId?: unknown; hostNickname?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: { code: "bad-request", message: "Invalid JSON." } },
      { status: 400 },
    );
  }

  const scaleId = typeof body.scaleId === "string" ? body.scaleId : "";
  const hostNickname = typeof body.hostNickname === "string" ? body.hostNickname.trim() : "";

  if (!isScaleId(scaleId)) {
    return NextResponse.json(
      { error: { code: "scale-invalid", message: "Unsupported scale." } },
      { status: 400 },
    );
  }
  if (!hostNickname) {
    return NextResponse.json(
      { error: { code: "nickname-empty", message: "Nickname is required." } },
      { status: 400 },
    );
  }

  let roomId = generateRoomId();
  while (store.has(roomId)) roomId = generateRoomId();
  const hostSessionId = randomUUID();

  const room = createRoom({
    roomId,
    scaleId,
    hostSessionId,
    hostNickname,
    now: Date.now(),
  });
  store.create(room);

  const jar = await cookies();
  jar.set(`pp_session_${roomId}`, hostSessionId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  jar.set(`pp_nickname_${roomId}`, hostNickname, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });

  logger.info({ event: "room.created", roomId, scaleId, via: "http" }, "room created via POST");

  return NextResponse.json({ roomId }, { status: 201 });
}
