"use client";

import { Dialog } from "@/components/ui/dialog";

export type PhotoEvidenceItem = {
  id: string;
  fileName: string;
  uploadedAt?: number;
  url: string;
};

function formatTimestamp(timestamp?: number) {
  if (!timestamp) return null;

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function PhotoEvidenceGallery({
  emptyMessage = "No photos attached.",
  photos,
  previewPhotoId,
  setPreviewPhotoId,
  title = "Photo evidence",
}: {
  emptyMessage?: string;
  photos: PhotoEvidenceItem[];
  previewPhotoId: string | null;
  setPreviewPhotoId: (photoId: string | null) => void;
  title?: string;
}) {
  const previewPhoto = photos.find((photo) => photo.id === previewPhotoId) ?? null;

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {photos.length} attached
          </p>
        </div>

        {photos.length === 0 ? (
          <div className="rounded-[1.05rem] border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            {emptyMessage}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <button
                className="rounded-[1.05rem] border border-[rgba(23,29,25,0.08)] bg-white/90 p-2 text-left"
                key={photo.id}
                onClick={() => setPreviewPhotoId(photo.id)}
                type="button"
              >
                <img
                  alt={photo.fileName}
                  className="h-28 w-full rounded-lg object-cover"
                  src={photo.url}
                />
                <p className="mt-2 truncate text-xs font-semibold text-slate-950">{photo.fileName}</p>
                {photo.uploadedAt ? (
                  <p className="mt-1 text-[11px] text-slate-500">{formatTimestamp(photo.uploadedAt)}</p>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog onClose={() => setPreviewPhotoId(null)} open={previewPhoto !== null}>
        {previewPhoto ? (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-950">{previewPhoto.fileName}</p>
                {previewPhoto.uploadedAt ? (
                  <p className="text-xs text-slate-500">{formatTimestamp(previewPhoto.uploadedAt)}</p>
                ) : null}
              </div>
              <button
                className="text-sm font-semibold text-slate-500"
                onClick={() => setPreviewPhotoId(null)}
                type="button"
              >
                Close
              </button>
            </div>
            <img
              alt={previewPhoto.fileName}
              className="max-h-[70vh] w-full rounded-2xl object-contain"
              src={previewPhoto.url}
            />
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
