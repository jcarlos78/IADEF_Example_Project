import { cookies } from "next/headers";
import { RoomClient } from "./RoomClient";

export default async function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: roomId } = await params;
  const jar = await cookies();
  const sessionCookie = jar.get(`pp_session_${roomId}`);
  const nicknameCookie = jar.get(`pp_nickname_${roomId}`);
  return (
    <RoomClient
      roomId={roomId}
      initialSessionId={sessionCookie?.value ?? null}
      initialNickname={nicknameCookie?.value ?? null}
    />
  );
}
