"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { MediaAsset } from "@/lib/supabase";
import { formatBytes, MAX_TOTAL_ATTACHMENT_BYTES } from "@/lib/media";

export default function AttachmentPicker({
  emailId,
  mediaAssets,
  disabled,
}: {
  emailId: string;
  mediaAssets: MediaAsset[];
  disabled?: boolean;
}) {
  const [attachedIds, setAttachedIds] = useState<Set<string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/outreach/emails/${emailId}/attachments`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAttachedIds(new Set((data.mediaAssets ?? []).map((a: MediaAsset) => a.id)));
      })
      .catch(() => {
        if (!cancelled) setAttachedIds(new Set());
      });
    return () => {
      cancelled = true;
    };
  }, [emailId]);

  async function toggle(assetId: string, currentlyAttached: boolean) {
    setPendingId(assetId);
    setError(null);
    try {
      const res = currentlyAttached
        ? await fetch(
            `/api/outreach/emails/${emailId}/attachments?mediaAssetId=${assetId}`,
            { method: "DELETE" }
          )
        : await fetch(`/api/outreach/emails/${emailId}/attachments`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mediaAssetId: assetId }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update attachment");
      setAttachedIds((prev) => {
        const next = new Set(prev);
        if (currentlyAttached) next.delete(assetId);
        else next.add(assetId);
        return next;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  }

  if (mediaAssets.length === 0) {
    return (
      <p className="text-sm text-muted">
        No files in your{" "}
        <Link href="/outreach/media" className="text-accent underline underline-offset-2">
          media library
        </Link>{" "}
        yet — upload a headshot, book cover, or one-pager there to attach it here.
      </p>
    );
  }

  const attached = attachedIds ?? new Set<string>();
  const totalBytes = mediaAssets
    .filter((a) => attached.has(a.id))
    .reduce((sum, a) => sum + a.size_bytes, 0);
  const overCap = totalBytes > MAX_TOTAL_ATTACHMENT_BYTES;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {mediaAssets.map((asset) => {
          const isAttached = attached.has(asset.id);
          return (
            <button
              key={asset.id}
              type="button"
              disabled={disabled || pendingId === asset.id || attachedIds === null}
              onClick={() => toggle(asset.id, isAttached)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors disabled:opacity-50 ${
                isAttached
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-card-border text-muted hover:bg-accent-soft"
              }`}
            >
              {isAttached ? "✓ " : "+ "}
              {asset.file_name} · {formatBytes(asset.size_bytes)}
            </button>
          );
        })}
      </div>
      {attached.size > 0 && (
        <p className={`text-xs ${overCap ? "text-red-600 dark:text-red-400" : "text-muted"}`}>
          {formatBytes(totalBytes)} attached
          {overCap ? ` — over the ${formatBytes(MAX_TOTAL_ATTACHMENT_BYTES)} limit, remove one before sending` : ""}
        </p>
      )}
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
