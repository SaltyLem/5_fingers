"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";

type Entry = {
  id: string;
  name: string;
  fingers: number;
  comment: string;
  images: string[];
  timestamp: number;
};

const FINGER_LABELS = ["1", "2", "3", "4", "5"];
const FINGER_EMOJI = ["😢", "😕", "😐", "😊", "😆"];
const FINGER_BG = [
  "bg-red-500/15 text-red-700 dark:text-red-400",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400",
  "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "bg-lime-500/15 text-lime-700 dark:text-lime-400",
  "bg-green-500/15 text-green-700 dark:text-green-400",
];
const FINGER_BG_SELECTED = [
  "bg-red-500 text-white",
  "bg-orange-500 text-white",
  "bg-yellow-500 text-white",
  "bg-lime-500 text-white",
  "bg-green-500 text-white",
];

const COMMENT_TRUNCATE_LENGTH = 60;
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

function CommentText({ text }: { text: string }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) =>
        URL_REGEX.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-accent underline decoration-accent/40 hover:decoration-accent"
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function RoomPage() {
  const { id } = useParams<{ id: string }>();
  const [name, setName] = useState("");
  const [nameSet, setNameSet] = useState(false);
  const [fingers, setFingers] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [dragging, setDragging] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`/api/room/${id}`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    const saved = localStorage.getItem("5fingers_name");
    if (saved) {
      setName(saved);
      setNameSet(true);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
    intervalRef.current = setInterval(fetchEntries, 2000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchEntries]);

  function handleSetName(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) {
      localStorage.setItem("5fingers_name", name.trim());
      setName(name.trim());
      setNameSet(true);
    }
  }

  async function addFiles(files: FileList | File[]) {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const remaining = 5 - images.length;
    const toAdd = imageFiles.slice(0, remaining);
    const dataUrls = await Promise.all(toAdd.map(readFileAsDataURL));
    setImages((prev) => [...prev, ...dataUrls].slice(0, 5));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData.items;
    const imageFiles: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        const file = items[i].getAsFile();
        if (file) imageFiles.push(file);
      }
    }
    if (imageFiles.length > 0) {
      e.preventDefault();
      addFiles(imageFiles);
    }
  }

  async function handleSubmit() {
    if (!fingers || submitting) return;
    setSubmitting(true);
    try {
      await fetch(`/api/room/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, fingers, comment, images }),
      });
      setComment("");
      setImages([]);
      await fetchEntries();
    } finally {
      setSubmitting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!nameSet) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <form onSubmit={handleSetName} className="w-full max-w-xs space-y-4 text-center">
          <h1 className="text-2xl font-bold text-foreground">名前を入力</h1>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="あなたの名前"
            autoFocus
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-[15px] text-foreground outline-none placeholder:text-secondary/60 focus:border-accent focus:ring-1 focus:ring-accent/30"
          />
          <button
            type="submit"
            className="w-full rounded-md bg-foreground px-6 py-2.5 text-[15px] font-medium text-background transition-opacity hover:opacity-90"
          >
            参加する
          </button>
        </form>
      </div>
    );
  }

  const myEntry = entries.find((e) => e.name === name);
  const average =
    entries.length > 0
      ? entries.reduce((sum, e) => sum + e.fingers, 0) / entries.length
      : 0;

  const hasDetail = (entry: Entry) =>
    (entry.comment && (entry.comment.length > COMMENT_TRUNCATE_LENGTH || entry.comment.includes("\n"))) ||
    (entry.images && entry.images.length > 0);

  return (
    <div className="flex min-h-screen">
      {/* Main content */}
      <div className={`min-h-screen flex-1 transition-all ${selectedEntry ? "mr-[380px]" : ""}`}>
        <div className="mx-auto max-w-2xl px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{id}</h1>
              {editingName ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (nameDraft.trim()) {
                      setName(nameDraft.trim());
                      localStorage.setItem("5fingers_name", nameDraft.trim());
                    }
                    setEditingName(false);
                  }}
                  className="mt-1 flex items-center gap-2"
                >
                  <input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-accent"
                  />
                  <button
                    type="submit"
                    className="rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
                  >
                    保存
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingName(false)}
                    className="rounded-md px-2.5 py-1 text-xs text-secondary hover:bg-hover"
                  >
                    キャンセル
                  </button>
                </form>
              ) : (
                <div className="mt-0.5 flex items-center gap-2">
                  <p className="text-sm text-secondary">{name} として参加中</p>
                  <button
                    onClick={() => { setNameDraft(name); setEditingName(true); }}
                    className="rounded-md px-2 py-0.5 text-xs text-secondary transition-colors hover:bg-hover hover:text-foreground"
                  >
                    名前を変更
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={copyLink}
              className="rounded-md px-3 py-1.5 text-sm text-secondary transition-colors hover:bg-hover hover:text-foreground"
            >
              {copied ? "コピーした!" : "リンクをコピー"}
            </button>
          </div>

          {/* Finger selector */}
          <div className="mb-8">
            <p className="mb-3 text-sm font-medium text-secondary">
              今日の調子は？
            </p>
            <div className="mb-4 flex gap-2">
              {FINGER_LABELS.map((label, i) => {
                const value = i + 1;
                const selected = fingers === value;
                return (
                  <button
                    key={value}
                    onClick={() => setFingers(value)}
                    className={`flex h-12 w-12 flex-col items-center justify-center rounded-md transition-all ${
                      selected
                        ? FINGER_BG_SELECTED[i]
                        : `${FINGER_BG[i]} hover:opacity-80`
                    }`}
                  >
                    <span className="text-base">{FINGER_EMOJI[i]}</span>
                    <span className="text-[11px] font-semibold">{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Comment area with drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mb-3 rounded-md border bg-background transition-colors ${
                dragging ? "border-accent bg-accent/5" : "border-border"
              }`}
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onPaste={handlePaste}
                placeholder="コメント（任意）&#10;※ 秘匿情報（パスワード等）は書かないでください"
                rows={3}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSubmit();
                }}
                className="w-full resize-none bg-transparent px-3 py-2 text-[15px] text-foreground outline-none placeholder:text-secondary/60"
              />

              {/* Image previews */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-2 px-3 pb-2">
                  {images.map((img, i) => (
                    <div key={i} className="group relative">
                      <img
                        src={img}
                        alt=""
                        className="h-16 w-16 rounded object-cover"
                      />
                      <button
                        onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                        className="absolute -right-1.5 -top-1.5 hidden h-5 w-5 items-center justify-center rounded-full bg-foreground text-[10px] text-background group-hover:flex"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Bottom toolbar */}
              <div className="flex items-center border-t border-border px-3 py-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="rounded p-1 text-secondary transition-colors hover:bg-hover hover:text-foreground"
                  title="画像を追加"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="2" width="14" height="14" rx="2" />
                    <circle cx="6.5" cy="6.5" r="1.5" />
                    <path d="M16 11.5l-3.5-3.5L4 16" />
                  </svg>
                </button>
                {images.length > 0 && (
                  <span className="ml-2 text-xs text-secondary">{images.length}/5</span>
                )}
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!fingers || submitting}
              className="rounded-md bg-accent px-5 py-2 text-[15px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              {myEntry ? "更新する" : "送信する"}
            </button>
          </div>

          {/* Stats */}
          {entries.length > 0 && (
            <div className="mb-6 flex items-center gap-4 rounded-md bg-surface px-4 py-3">
              <span className="text-sm text-secondary">
                {entries.length}人が回答
              </span>
              <span className="text-[15px] font-semibold text-foreground">
                平均 {average.toFixed(1)} {FINGER_EMOJI[Math.round(average) - 1] || ""}
              </span>
            </div>
          )}

          {/* Entries list */}
          <div className="divide-y divide-border">
            {entries
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((entry) => {
                const detail = hasDetail(entry);
                const longText = entry.comment && (entry.comment.length > COMMENT_TRUNCATE_LENGTH || entry.comment.includes("\n"));
                return (
                  <div
                    key={entry.id}
                    onClick={() => detail && setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
                    className={`flex items-start gap-3 px-1 py-3 transition-colors hover:bg-hover ${detail ? "cursor-pointer" : ""} ${selectedEntry?.id === entry.id ? "bg-hover" : ""}`}
                  >
                    <div
                      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${FINGER_BG[entry.fingers - 1]}`}
                    >
                      {FINGER_EMOJI[entry.fingers - 1]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="text-[15px] font-medium text-foreground">{entry.name}</span>
                        <span className="text-sm text-secondary">{entry.fingers}/5</span>
                        {entry.images && entry.images.length > 0 && (
                          <span className="text-xs text-secondary">
                            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.3" className="inline -mt-0.5">
                              <rect x="2" y="2" width="14" height="14" rx="2" />
                              <circle cx="6.5" cy="6.5" r="1.5" />
                              <path d="M16 11.5l-3.5-3.5L4 16" />
                            </svg>
                            {entry.images.length > 1 && ` ${entry.images.length}`}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-xs text-secondary">
                          {new Date(entry.timestamp).toLocaleTimeString("ja-JP", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      {entry.comment && (
                        <p className="mt-0.5 text-[14px] leading-relaxed text-secondary">
                          {longText ? (
                            <span className="line-clamp-1">{entry.comment.replace(/\n/g, " ")}</span>
                          ) : (
                            <span className="whitespace-pre-wrap"><CommentText text={entry.comment} /></span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {entries.length === 0 && (
            <p className="py-12 text-center text-secondary">
              まだ誰も回答していません
            </p>
          )}
        </div>
      </div>

      {/* Side panel */}
      {selectedEntry && (
        <div className="fixed right-0 top-0 h-full w-[380px] border-l border-border bg-background overflow-y-auto">
          <div className="px-5 py-6">
            {/* Panel header */}
            <div className="mb-6 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base ${FINGER_BG[selectedEntry.fingers - 1]}`}
                >
                  {FINGER_EMOJI[selectedEntry.fingers - 1]}
                </div>
                <div>
                  <p className="text-[15px] font-medium text-foreground">{selectedEntry.name}</p>
                  <p className="text-sm text-secondary">
                    {selectedEntry.fingers}/5 &middot;{" "}
                    {new Date(selectedEntry.timestamp).toLocaleTimeString("ja-JP", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                className="rounded-md p-1 text-secondary transition-colors hover:bg-hover hover:text-foreground"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>

            {/* Comment content */}
            {selectedEntry.comment && (
              <div className="border-t border-border pt-4">
                <p className="text-[13px] font-medium text-secondary mb-2">コメント</p>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">
                  <CommentText text={selectedEntry.comment} />
                </p>
              </div>
            )}

            {/* Images */}
            {selectedEntry.images && selectedEntry.images.length > 0 && (
              <div className={`border-t border-border pt-4 ${selectedEntry.comment ? "mt-4" : ""}`}>
                <p className="text-[13px] font-medium text-secondary mb-2">画像</p>
                <div className="space-y-2">
                  {selectedEntry.images.map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt=""
                      className="w-full rounded-md"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
