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
  onRemove,
  photos,
  previewPhotoId,
  setPreviewPhotoId,
}: {
  onRemove?: (photoId: string) => void;
  photos: PhotoEvidenceItem[];
  previewPhotoId: string | null;
  setPreviewPhotoId: (photoId: string | null) => void;
}) {
  const previewPhoto = photos.find((photo) => photo.id === previewPhotoId) ?? null;

  return (
    <>
      <Dialog onClose={() => setPreviewPhotoId(null)} open={previewPhoto !== null}>
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-950">Uploaded photo preview</p>
              <p className="text-xs text-slate-500">{photos.length} attached</p>
            </div>
            <button
              className="text-sm font-semibold text-slate-500"
              onClick={() => setPreviewPhotoId(null)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <div
                className={`rounded-xl border p-2 ${
                  previewPhoto?.id === photo.id
                    ? "border-emerald-300 bg-emerald-50"
                    : "border-slate-200 bg-slate-50"
                }`}
                key={photo.id}
              >
                <button
                  className="block w-full overflow-hidden rounded-lg"
                  onClick={() => setPreviewPhotoId(photo.id)}
                  type="button"
                >
                  <img
                    alt={photo.fileName}
                    className="h-24 w-full rounded-lg object-cover"
                    src={photo.url}
                  />
                </button>
                <div className="mt-2 space-y-1">
                  <p className="truncate text-xs font-semibold text-slate-900">{photo.fileName}</p>
                  {photo.uploadedAt ? (
                    <p className="text-[11px] text-slate-500">{formatTimestamp(photo.uploadedAt)}</p>
                  ) : null}
                </div>
                {onRemove ? (
                  <button
                    className="mt-2 text-xs font-semibold text-rose-700"
                    onClick={() => onRemove(photo.id)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {previewPhoto ? (
            <img
              alt={previewPhoto.fileName}
              className="max-h-[70vh] w-full rounded-2xl object-contain"
              src={previewPhoto.url}
            />
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
