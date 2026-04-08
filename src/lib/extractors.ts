import * as mammoth from 'mammoth';

const MAX_CHARS_PER_SOURCE = 20_000;

export interface ExtractedSource {
  text: string;
  source: string;
  truncated: boolean;
}

export type SourceType = 'pdf' | 'docx' | 'txt' | 'url';

export function getSourceType(filename: string): SourceType | null {
  const ext = filename.toLowerCase().split('.').pop();
  switch (ext) {
    case 'pdf': return 'pdf';
    case 'docx': return 'docx';
    case 'txt': return 'txt';
    case 'md': return 'txt';
    default: return null;
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid Turbopack worker bundling issues
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // Point workerSrc to the actual worker file so pdfjs can load it server-side
  const path = await import('path');
  pdfjsLib.GlobalWorkerOptions.workerSrc = path.join(
    process.cwd(),
    'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
  );

  const uint8 = new Uint8Array(buffer);
  const doc = await pdfjsLib.getDocument({ data: uint8, isEvalSupported: false, useSystemFonts: true }).promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .filter((item): item is Extract<typeof item, { str: string }> => 'str' in item)
      .map((item) => item.str)
      .join(' ');
    pages.push(strings);
  }
  await doc.destroy();
  return pages.join('\n\n');
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function extractText(buffer: Buffer): string {
  return buffer.toString('utf-8');
}

export async function extractFile(file: File): Promise<ExtractedSource> {
  const sourceType = getSourceType(file.name);
  if (!sourceType) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let text: string;
  switch (sourceType) {
    case 'pdf':
      text = await extractPdf(buffer);
      break;
    case 'docx':
      text = await extractDocx(buffer);
      break;
    case 'txt':
      text = extractText(buffer);
      break;
    default:
      throw new Error(`Unsupported file type: ${file.name}`);
  }

  const truncated = text.length > MAX_CHARS_PER_SOURCE;
  return {
    text: text.slice(0, MAX_CHARS_PER_SOURCE),
    source: file.name,
    truncated,
  };
}

const COMBINED_LIMIT = 60_000;

export function enforceCombinedLimit(sources: ExtractedSource[]): ExtractedSource[] {
  const totalLength = sources.reduce((sum, s) => sum + s.text.length, 0);
  if (totalLength <= COMBINED_LIMIT) return sources;

  return sources.map((s) => {
    const proportion = s.text.length / totalLength;
    const allowedChars = Math.floor(proportion * COMBINED_LIMIT);
    const truncated = s.text.length > allowedChars || s.truncated;
    return {
      text: s.text.slice(0, allowedChars),
      source: s.source,
      truncated,
    };
  });
}

export function buildSourceXml(sources: ExtractedSource[]): string {
  if (sources.length === 0) return '';

  const sourceBlocks = sources.map((s) => {
    const type = getSourceType(s.source) || 'url';
    const truncationNote = s.truncated
      ? '\n[Note: This document was truncated at 20,000 characters due to length.]'
      : '';
    return `  <source type="${type}" name="${s.source}">\n    ${s.text}${truncationNote}\n  </source>`;
  });

  return `<source_material>\n${sourceBlocks.join('\n')}\n</source_material>`;
}
