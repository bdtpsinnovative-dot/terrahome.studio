"use client";

import VisualImageSearch, {
  type VisualSearchPreviewState,
  type VisualSearchState,
} from "./VisualImageSearch";

const interactionStates: VisualSearchPreviewState[] = ["default", "hover", "focus", "active"];
const asyncStates: VisualSearchState[] = ["loading", "error", "success"];

export default function VisualImageSearchPreview() {
  return (
    <section aria-label="Visual image search component states" className="p-8 max-w-xl mx-auto space-y-6 bg-[#EAE7E0] min-h-screen">
      <div className="border-b border-[#3A3835]/15 pb-3">
        <h2 className="font-serif text-lg tracking-widest uppercase text-[#3A3835]">Visual Image Search — 8 States</h2>
        <p className="text-xs text-[#8C8A86] uppercase tracking-wider font-mono">Hallmark Component Preview Checklist</p>
      </div>

      {/* 1. Modal Open */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-[#84492C] font-bold uppercase">1. Modal Open (Dropzone)</span>
        <VisualImageSearch preview previewModalOpen />
      </div>

      {/* 2-5. Interaction States */}
      {interactionStates.map((state, idx) => (
        <div key={state} className="space-y-1">
          <span className="text-[10px] font-mono text-[#8C8A86] uppercase">{idx + 2}. Interaction: {state}</span>
          <VisualImageSearch preview previewState={state} placeholder={`STATE: ${state.toUpperCase()}`} />
        </div>
      ))}

      {/* 6. Disabled */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-[#8C8A86] uppercase">6. Disabled</span>
        <VisualImageSearch preview disabled placeholder="SEARCH DISABLED" />
      </div>

      {/* 7. Loading Scan */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-[#8C8A86] uppercase">7. Async: Loading / Scanning</span>
        <VisualImageSearch preview state="loading" />
      </div>

      {/* 8. Active Image Search (Success State) */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono text-[#84492C] font-bold uppercase">8. Success (Active Image Pill in Search)</span>
        <VisualImageSearch
          preview
          activeImage={{
            imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=120&q=80",
            name: "VASE-SAMPLE.JPG",
            matchedProductIds: [38005, 38004],
          }}
        />
      </div>
    </section>
  );
}
