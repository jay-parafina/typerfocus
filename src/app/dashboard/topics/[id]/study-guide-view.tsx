'use client';

import { useState } from 'react';
import { useReadAloud } from '@/hooks/useReadAloud';
import type { StudyKitData } from '@/types/study-kit';

const TEAL = '#2dd4bf';
const AMBER = '#e2b714';
const DIM = '#646669';
const SURFACE = '#2c2e31';
const TEXT = '#d1d0c5';
const RED = '#ca4754';

interface StudyGuideViewProps {
  topic: {
    title: string;
    overview: string;
    key_concepts: string[];
  };
  sections: {
    title: string;
    body: string;
  }[];
}

export default function StudyGuideView({ topic, sections }: StudyGuideViewProps) {
  const [expanded, setExpanded] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const { speak, stop, isPlaying } = useReadAloud();

  const allText = [topic.overview, ...sections.map((s) => s.body)].filter(Boolean).join('. ');

  function handleReadAloud() {
    if (isPlaying) {
      stop();
      return;
    }
    const selection = window.getSelection()?.toString().trim();
    speak(selection || allText);
  }

  async function handleExportPdf() {
    setExporting(true);
    setExportError('');
    try {
      const guideData: StudyKitData = {
        title: topic.title,
        overview: topic.overview,
        key_concepts: topic.key_concepts,
        sections: sections.map((s) => ({ title: s.title, body: s.body })),
        typing_exercises: [],
      };

      const res = await fetch('/api/export-study-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guideData, topic: topic.title }),
      });

      if (!res.ok) throw new Error('Export failed');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-').toLowerCase()}-study-guide.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError('Failed to export PDF — try again.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="mb-8">
      {/* Toggle header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs uppercase tracking-widest mb-3 transition-colors hover:text-[#d1d0c5]"
        style={{ color: '#3d3f42' }}
      >
        <span style={{ display: 'inline-block', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
          ▶
        </span>
        study guide
      </button>

      {expanded && (
        <div
          className="rounded-lg px-6 py-6"
          style={{ backgroundColor: SURFACE, border: '1px solid #3d3f42' }}
        >
          {/* Read-aloud + PDF export bar */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={handleReadAloud}
              className="rounded px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90"
              style={{ backgroundColor: AMBER, color: '#323437' }}
            >
              {isPlaying ? '■ Stop' : '▶ Play'}
            </button>
            <span className="text-xs" style={{ color: DIM }}>
              {isPlaying ? 'reading aloud...' : 'select text or press play to listen'}
            </span>
            <button
              onClick={handleExportPdf}
              disabled={exporting}
              className="ml-auto rounded px-3 py-1.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: SURFACE, color: TEXT, border: `1px solid #3d3f42` }}
            >
              {exporting ? 'exporting...' : '↓ PDF'}
            </button>
          </div>

          {exportError && (
            <p className="text-sm mb-4" style={{ color: RED }}>{exportError}</p>
          )}

          {/* Overview */}
          <p className="text-sm leading-relaxed mb-6" style={{ color: TEXT }}>
            {topic.overview}
          </p>

          {/* Key concepts */}
          {topic.key_concepts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {topic.key_concepts.map((c, i) => (
                <span
                  key={i}
                  className="rounded-full px-3 py-1 text-xs"
                  style={{ backgroundColor: '#323437', color: TEAL }}
                >
                  {c}
                </span>
              ))}
            </div>
          )}

          {/* Section content */}
          {sections.map((section, i) => (
            <div key={i} className="mb-5 last:mb-0">
              <h3 className="text-sm font-medium mb-1" style={{ color: TEXT }}>
                {i + 1}. {section.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: DIM }}>
                {section.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
