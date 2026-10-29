// server/src/utils/pdf.ts
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import type { Response } from 'express';

/**
 * Bengali-capable PDF helpers (pdfkit + embedded Hind Siliguri).
 *
 * Required font files (commit them to the repo, NOT generated here):
 *   server/assets/fonts/HindSiliguri-Regular.ttf
 *   server/assets/fonts/HindSiliguri-Bold.ttf   (optional; falls back to Regular)
 * Override the folder with PDF_FONT_DIR if needed.
 */

const REGULAR_FILE = 'HindSiliguri-Regular.ttf';
const BOLD_FILE = 'HindSiliguri-Bold.ttf';

export const MAX_PDF_ROWS = 5000;

const MARGIN = 40;
const PAD = 5;
const FONT_SIZE = 9;
const NAVY = '#102A43';
const INK = '#172B4D';
const MUTED = '#486581';
const GOLD = '#D6AD60';
const STRIPE = '#F5F7FB';
const BORDER = '#D9E2EC';

export interface PdfColumn {
  header: string;
  /** Relative width; default 1. */
  weight?: number;
  align?: 'left' | 'right' | 'center';
}

export type PdfCell = string | number | null | undefined;

export interface TablePdfOptions {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: PdfCell[][];
  orientation?: 'portrait' | 'landscape';
  footerNote?: string;
  generatedAt?: Date;
}

interface FontSet {
  regular: Buffer;
  bold: Buffer;
}

let cachedFonts: FontSet | null = null;

function fontDirs(): string[] {
  return [
    process.env.PDF_FONT_DIR,
    path.resolve(process.cwd(), 'assets/fonts'),
    path.resolve(process.cwd(), 'server/assets/fonts'),
  ].filter((p): p is string => Boolean(p));
}

function loadFonts(): FontSet {
  if (cachedFonts) return cachedFonts;
  for (const dir of fontDirs()) {
    const regularPath = path.join(dir, REGULAR_FILE);
    if (!fs.existsSync(regularPath)) continue;
    const boldPath = path.join(dir, BOLD_FILE);
    const regular = fs.readFileSync(regularPath);
    const bold = fs.existsSync(boldPath) ? fs.readFileSync(boldPath) : regular;
    cachedFonts = { regular, bold };
    return cachedFonts;
  }
  throw new Error(
    `Bengali PDF font not found. Place ${REGULAR_FILE} in server/assets/fonts/ (or set PDF_FONT_DIR).`,
  );
}

function cellText(c: PdfCell): string {
  return c === null || c === undefined ? '' : String(c);
}

function formatBdDateTime(d: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dhaka',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(d);
}

/** Renders a titled table to a PDF buffer (header repeats on every page). */
export async function buildTablePdf(options: TablePdfOptions): Promise<Buffer> {
  const {
    title,
    subtitle,
    columns,
    rows,
    orientation = 'portrait',
    footerNote = 'The Little Flower School',
    generatedAt = new Date(),
  } = options;

  if (columns.length === 0) throw new Error('PDF table needs at least one column');
  if (rows.length > MAX_PDF_ROWS) throw new Error(`PDF export is limited to ${MAX_PDF_ROWS} rows`);

  const fonts = loadFonts();

  const doc = new PDFDocument({
    size: 'A4',
    layout: orientation,
    margin: MARGIN,
    bufferPages: true,
    info: { Title: title, Author: 'The Little Flower School' },
  });
  doc.registerFont('Body', fonts.regular);
  doc.registerFont('Bold', fonts.bold);

  const chunks: Buffer[] = [];
  const done = new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  const left = MARGIN;
  const usableWidth = doc.page.width - MARGIN * 2;
  const totalWeight = columns.reduce((sum, c) => sum + (c.weight ?? 1), 0);
  const widths = columns.map((c) => (usableWidth * (c.weight ?? 1)) / totalWeight);
  const bottomLimit = (): number => doc.page.height - MARGIN - 18;
  const headers = columns.map((c) => c.header);

  // ── Title block ──
  doc.font('Bold').fontSize(16).fillColor(NAVY).text(title, left, MARGIN, { width: usableWidth });
  if (subtitle) {
    doc.font('Body').fontSize(10).fillColor(MUTED).text(subtitle, left, doc.y, { width: usableWidth });
  }
  const ruleY = doc.y + 4;
  doc
    .moveTo(left, ruleY)
    .lineTo(left + usableWidth, ruleY)
    .lineWidth(1.5)
    .strokeColor(GOLD)
    .stroke();
  let y = ruleY + 10;

  // ── Table ──
  const drawRow = (cells: string[], kind: 'header' | 'even' | 'odd'): void => {
    const header = kind === 'header';
    doc.font(header ? 'Bold' : 'Body').fontSize(FONT_SIZE);
    const heights = cells.map((c, i) =>
      Math.max(doc.heightOfString(c, { width: widths[i] - PAD * 2 }), doc.currentLineHeight()),
    );
    const h = Math.max(...heights) + PAD * 2;

    if (y + h > bottomLimit()) {
      doc.addPage();
      y = MARGIN;
      if (!header) drawRow(headers, 'header');
    }

    doc.font(header ? 'Bold' : 'Body').fontSize(FONT_SIZE);
    let x = left;
    cells.forEach((cell, i) => {
      const bg = header ? NAVY : kind === 'odd' ? STRIPE : '#FFFFFF';
      doc.lineWidth(0.5).rect(x, y, widths[i], h).fillAndStroke(bg, BORDER);
      doc.fillColor(header ? '#FFFFFF' : INK).text(cell, x + PAD, y + PAD, {
        width: widths[i] - PAD * 2,
        align: columns[i].align ?? 'left',
      });
      x += widths[i];
    });
    y += h;
  };

  drawRow(headers, 'header');

  if (rows.length === 0) {
    doc.font('Body').fontSize(10).fillColor(MUTED).text('কোনো তথ্য নেই / No data', left, y + 12, {
      width: usableWidth,
      align: 'center',
    });
  } else {
    rows.forEach((row, idx) => {
      const cells = columns.map((_, i) => cellText(row[i]));
      drawRow(cells, idx % 2 === 0 ? 'even' : 'odd');
    });
  }

  // ── Footer on every page ──
  const range = doc.bufferedPageRange();
  const generated = formatBdDateTime(generatedAt);
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0; // allow writing inside the bottom margin without auto page-break
    doc
      .font('Body')
      .fontSize(8)
      .fillColor('#829AB1')
      .text(
        `${footerNote} • ${generated} • ${i - range.start + 1}/${range.count}`,
        left,
        doc.page.height - MARGIN + 8,
        { width: usableWidth, align: 'center', lineBreak: false },
      );
    doc.page.margins.bottom = savedBottom;
  }

  doc.end();
  return done;
}

function safeFilename(name: string): string {
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
  return cleaned.toLowerCase().endsWith('.pdf') ? cleaned : `${cleaned}.pdf`;
}

/** Sends a PDF download response. */
export function sendPdf(res: Response, filename: string, buffer: Buffer): void {
  const file = safeFilename(filename);
  res.status(200);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${file}"; filename*=UTF-8''${encodeURIComponent(file)}`);
  res.setHeader('Content-Length', String(buffer.length));
  res.setHeader('Cache-Control', 'no-store');
  res.end(buffer);
  }
