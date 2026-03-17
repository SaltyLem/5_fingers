import { NextRequest, NextResponse } from "next/server";

type Entry = {
  id: string;
  name: string;
  fingers: number;
  comment: string;
  images: string[];
  timestamp: number;
};

const EXPIRE_MS = 30 * 60 * 1000; // 30 minutes
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB per image
const MAX_IMAGES = 5;

// In-memory store: roomId -> date -> entries
const rooms = new Map<string, Map<string, Entry[]>>();

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function getEntries(roomId: string, date: string): Entry[] {
  const entries = rooms.get(roomId)?.get(date) ?? [];
  const now = Date.now();
  const active = entries.filter((e) => now - e.timestamp < EXPIRE_MS);
  if (active.length !== entries.length) {
    rooms.get(roomId)?.set(date, active);
  }
  return active;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const today = getTodayKey();
  const entries = getEntries(id, today);
  return NextResponse.json({ entries, date: today });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { name, fingers, comment, images } = body;

  if (!name || !fingers || fingers < 1 || fingers > 5) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  let validImages: string[] = [];
  if (Array.isArray(images)) {
    validImages = images
      .filter((img: unknown): img is string =>
        typeof img === "string" &&
        img.startsWith("data:image/") &&
        img.length <= MAX_IMAGE_SIZE * 1.37 // base64 overhead
      )
      .slice(0, MAX_IMAGES);
  }

  const today = getTodayKey();

  if (!rooms.has(id)) {
    rooms.set(id, new Map());
  }
  const roomData = rooms.get(id)!;
  if (!roomData.has(today)) {
    roomData.set(today, []);
  }
  const entries = roomData.get(today)!;

  const existingIndex = entries.findIndex((e) => e.name === name);
  const entry: Entry = {
    id: crypto.randomUUID(),
    name,
    fingers,
    comment: comment || "",
    images: validImages,
    timestamp: Date.now(),
  };

  if (existingIndex >= 0) {
    entries[existingIndex] = entry;
  } else {
    entries.push(entry);
  }

  return NextResponse.json({ entry });
}
