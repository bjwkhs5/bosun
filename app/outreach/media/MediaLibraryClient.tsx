"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { MediaAsset } from "@/lib/supabase";
import { formatBytes } from "@/lib/media";

export default function MediaLibraryClient({ initial }: { initial: MediaAsset[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/outreach/media", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Failed to upload ${file.name}`);
        setAssets((prev) => [data.mediaAsset, ...prev]);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function deleteAsset(id: string) {
    if (!window.confirm("Delete this file? It'll be removed from any drafts using it.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/outreach/media/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      setAssets((prev) => prev.filter((a) => a.id !== id));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted">
        Upload files once here — your media kit, a headshot, rate card, media
        kit — then attach any of them to individual drafts from the contact
        page or Review & Send. JPEG, PNG, WebP, PDF, or Word docs, up to 8MB
        each.
      </p>

      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,image/jpeg,image/png,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(e) => upload(e.target.files)}
          disabled={uploading}
          className="text-sm"
        />
        {uploading && <p className="mt-2 text-sm text-muted">Uploading…</p>}
      </div>

      {error && (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      {assets.length === 0 ? (
        <p className="text-sm text-muted">No files uploaded yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-card-border rounded-lg border border-card-border bg-card">
          {assets.map((asset) => (
            <li key={asset.id} className="flex items-center justify-between gap-4 p-3">
              <div className="flex min-w-0 items-center gap-3">
                {asset.content_type.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/outreach/media/${asset.id}/file`}
                    alt=""
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-accent-soft text-xs text-muted">
                    {asset.content_type === "application/pdf" ? "PDF" : "DOC"}
                  </div>
                )}
                <div className="min-w-0">
                  <a
                    href={`/api/outreach/media/${asset.id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm font-medium hover:text-accent"
                  >
                    {asset.file_name}
                  </a>
                  <p className="text-xs text-muted">{formatBytes(asset.size_bytes)}</p>
                </div>
              </div>
              <button
                onClick={() => deleteAsset(asset.id)}
                disabled={deletingId === asset.id}
                className="shrink-0 rounded-md border border-red-500/30 px-3 py-1.5 text-xs text-red-600 hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
              >
                {deletingId === asset.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
