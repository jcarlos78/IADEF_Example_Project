"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreateRoomForm } from "@/components/CreateRoomForm";
import type { ScaleId } from "@/lib/scales";
import styles from "./page.module.css";

export default function HomePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handle({
    scaleId,
    hostNickname,
  }: {
    scaleId: ScaleId;
    hostNickname: string;
  }): Promise<void> {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scaleId, hostNickname }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: { message?: string };
        };
        setErrorMessage(body.error?.message ?? "Failed to create the room.");
        return;
      }
      const data = (await res.json()) as { roomId: string };
      router.push(`/room/${data.roomId}`);
    } catch {
      setErrorMessage("Network error while creating the room.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className={styles.main}>
      <CreateRoomForm onSubmit={handle} isSubmitting={isSubmitting} errorMessage={errorMessage} />
    </main>
  );
}
