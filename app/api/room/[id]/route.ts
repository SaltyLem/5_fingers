import { NextRequest, NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

type Entry = {
  id: string;
  name: string;
  fingers: number;
  comment: string;
  images: string[];
  timestamp: number;
};

const EXPIRE_SECONDS = 30 * 60; // 30 minutes
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function roomKey(roomId: string, date: string) {
  return `room:${roomId}:${date}`;
}

function entryKey(roomId: string, date: string, entryId: string) {
  return `entry:${roomId}:${date}:${entryId}`;
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const today = getTodayKey();
  const key = roomKey(id, today);

  const entryIds = await redis.smembers(key) as string[];
  if (entryIds.length === 0) {
    return NextResponse.json({ entries: [], date: today });
  }

  const pipeline = redis.pipeline();
  for (const eid of entryIds) {
    pipeline.get(entryKey(id, today, eid));
  }
  const results = await pipeline.exec();

  const entries: Entry[] = [];
  const expiredIds: string[] = [];

  for (let i = 0; i < results.length; i++) {
    if (results[i]) {
      entries.push(results[i] as Entry);
    } else {
      expiredIds.push(entryIds[i]);
    }
  }

  // Clean up expired entry references
  if (expiredIds.length > 0) {
    const cleanPipeline = redis.pipeline();
    for (const eid of expiredIds) {
      cleanPipeline.srem(key, eid);
    }
    await cleanPipeline.exec();
  }

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
        img.length <= MAX_IMAGE_SIZE * 1.37
      )
      .slice(0, MAX_IMAGES);
  }

  const today = getTodayKey();
  const key = roomKey(id, today);

  // Check for existing entry by this user
  const entryIds = await redis.smembers(key) as string[];
  let existingId: string | null = null;

  if (entryIds.length > 0) {
    const pipeline = redis.pipeline();
    for (const eid of entryIds) {
      pipeline.get(entryKey(id, today, eid));
    }
    const results = await pipeline.exec();
    for (let i = 0; i < results.length; i++) {
      const e = results[i] as Entry | null;
      if (e && e.name === name) {
        existingId = entryIds[i];
        break;
      }
    }
  }

  const entryId = existingId || crypto.randomUUID();
  const entry: Entry = {
    id: entryId,
    name,
    fingers,
    comment: comment || "",
    images: validImages,
    timestamp: Date.now(),
  };

  const eKey = entryKey(id, today, entryId);
  const pipeline = redis.pipeline();
  pipeline.set(eKey, JSON.stringify(entry), { ex: EXPIRE_SECONDS });
  pipeline.sadd(key, entryId);
  pipeline.expire(key, EXPIRE_SECONDS);
  await pipeline.exec();

  return NextResponse.json({ entry });
}
