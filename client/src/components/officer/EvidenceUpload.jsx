import React, { useRef } from 'react';

const ACCEPTED = '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.mp4,.mp3,.wav';

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function EvidenceUpload({ files, onChange }) {
  const inputRef = useRef();

  function handleFiles(incoming) {
    const next = [...files];
    for (const f of Array.from(incoming)) {
      if (next.length >= 5) break;
      if (!next.find(e => e.name === f.name && e.size === f.size)) next.push(f);
    }
    onChange(next);
  }

  function handleDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-maroon/40 transition-colors"
      >
        <p className="text-sm text-muted">Drag files here or <span className="text-maroon font-medium">click to browse</span></p>
        <p className="text-xs text-muted mt-1">PDF, Word, images, video, audio — max 10 MB each, up to 5 files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f, i) => (
            <div key={i} className="flex items-center gap-3 bg-white border border-border rounded-lg px-3 py-2">
              <span className="text-lg flex-shrink-0">📎</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{f.name}</p>
                <p className="text-xs text-muted">{formatBytes(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-muted hover:text-red-600 transition-colors text-sm"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
