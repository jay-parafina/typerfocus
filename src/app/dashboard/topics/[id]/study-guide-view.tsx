'use client';

import { useState } from 'react';
import { useReadAloud } from '@/hooks/useReadAloud';

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

  function handleExportPdf() {
    setExporting(true);
    setExportError('');
    try {
      const escHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const conceptsHtml = topic.key_concepts
        .map((c) => `<span class="concept">${escHtml(c)}</span>`)
        .join('');
      const sectionsHtml = sections
        .map((s, i) => `<div class="section"><h2>${i + 1}. ${escHtml(s.title)}</h2><p>${escHtml(s.body)}</p></div>`)
        .join('');

      const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><title>${escHtml(topic.title)}</title>
<style>
  body { font-family: Georgia, 'Times New Roman', serif; max-width: 680px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { font-size: 26px; margin-bottom: 6px; }
  .overview { font-size: 15px; color: #444; margin-bottom: 24px; }
  .concepts { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 28px; }
  .concept { background: #eee; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-family: sans-serif; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 18px; margin-bottom: 4px; }
  .section p { font-size: 14px; color: #333; }
  @media print { body { margin: 0; } }
</style></head>
<body>
  <h1>${escHtml(topic.title)}</h1>
  <p class="overview">${escHtml(topic.overview)}</p>
  <div class="concepts">${conceptsHtml}</div>
  ${sectionsHtml}
</body></html>`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setExportError('Pop-up blocked — allow pop-ups and try again.');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
      };
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
