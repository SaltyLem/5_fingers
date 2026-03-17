"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [roomId, setRoomId] = useState("");
  const router = useRouter();

  function createRoom() {
    const id = Math.random().toString(36).substring(2, 8);
    router.push(`/room/${id}`);
  }

  function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    if (roomId.trim()) {
      router.push(`/room/${roomId.trim()}`);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            5 Fingers
          </h1>
          <p className="mt-2 text-secondary">
            今日の気分を指で共有しよう
          </p>
        </div>

        <button
          onClick={createRoom}
          className="w-full rounded-md bg-foreground px-6 py-2.5 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
        >
          ルームを作成
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-background px-3 text-secondary">または</span>
          </div>
        </div>

        <form onSubmit={joinRoom} className="flex gap-2">
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="ルームIDを入力"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-secondary/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="submit"
            className="rounded-md bg-foreground px-5 py-2 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            参加
          </button>
        </form>
      </div>
    </div>
  );
}
