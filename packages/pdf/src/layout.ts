// Petit moteur de mise en page au-dessus de pdf-lib (pur JS, sans React, donc
// fonctionne dans le runtime serveur de Next.js, contrairement à @react-pdf).
// Modèle de coordonnées « de haut en bas » : un curseur vertical `y` descend
// au fil des lignes ; pdf-lib place lui le texte par sa ligne de base.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb, type RGB } from 'pdf-lib';

export const PAGE = { w: 595.28, h: 841.89 }; // A4 en points
export const M = 40; // marge
export const CONTENT_RIGHT = PAGE.w - M;
export const CONTENT_W = PAGE.w - M * 2;

function hex(h: string): RGB {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Les polices standard pdf-lib encodent en WinAnsi. Le formatage fr-FR (Intl)
// insère des espaces fines insécables (U+202F, U+00A0, U+2009, U+2007) et parfois
// un vrai signe moins (U+2212) qui ne sont pas encodables : on les normalise.
function sanitize(s: string): string {
  return s.replace(/[    ]/g, " ").replace(/−/g, "-");
}

export const C = {
  ink: hex('#0f172a'),
  petrol: hex('#0f4c5c'),
  mute: hex('#64748b'),
  line: hex('#cbd5e1'),
  line2: hex('#e2e8f0'),
  slate: hex('#94a3b8'),
  head: hex('#f1f5f9'),
  okBg: hex('#dcfce7'),
  okFg: hex('#166534'),
  koBg: hex('#fee2e2'),
  koFg: hex('#991b1b'),
  white: rgb(1, 1, 1),
};

interface TxtOpts {
  x?: number;
  size?: number;
  b?: boolean;
  color?: RGB;
}

export class Layout {
  pdf: PDFDocument;
  private font: PDFFont;
  private bold: PDFFont;
  page!: PDFPage;
  y = PAGE.h - M;

  private constructor(pdf: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.pdf = pdf;
    this.font = font;
    this.bold = bold;
  }

  static async create(): Promise<Layout> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    return new Layout(pdf, font, bold);
  }

  setTitle(t: string) {
    this.pdf.setTitle(sanitize(t));
  }

  newPage(): this {
    this.page = this.pdf.addPage([PAGE.w, PAGE.h]);
    this.y = PAGE.h - M;
    return this;
  }

  private f(b?: boolean): PDFFont {
    return b ? this.bold : this.font;
  }

  widthOf(s: string, size: number, b?: boolean): number {
    return this.f(b).widthOfTextAtSize(sanitize(s), size);
  }

  /** Coupe une chaîne pour tenir dans `maxW` (ajoute … si nécessaire). */
  ellipsize(s: string, maxW: number, size: number, b?: boolean): string {
    if (this.widthOf(s, size, b) <= maxW) return s;
    let out = s;
    while (out.length > 1 && this.widthOf(out + '…', size, b) > maxW) out = out.slice(0, -1);
    return out + '…';
  }

  /** Texte calé à gauche sur la ligne courante (ne descend pas le curseur). */
  txt(s: string, { x = M, size = 9, b = false, color = C.ink }: TxtOpts = {}): void {
    this.page.drawText(sanitize(s), { x, y: this.y - size, size, font: this.f(b), color });
  }

  /** Texte calé à droite de `xRight` sur la ligne courante. */
  rtxt(s: string, xRight: number, { size = 9, b = false, color = C.ink }: TxtOpts = {}): void {
    const clean = sanitize(s);
    this.page.drawText(clean, {
      x: xRight - this.f(b).widthOfTextAtSize(clean, size),
      y: this.y - size,
      size,
      font: this.f(b),
      color,
    });
  }

  /** Descend le curseur. */
  nl(dy: number): this {
    this.y -= dy;
    return this;
  }

  /** Filet horizontal à la hauteur du curseur. */
  hline(color: RGB = C.line, thickness = 1, x1 = M, x2 = CONTENT_RIGHT): void {
    this.page.drawLine({ start: { x: x1, y: this.y }, end: { x: x2, y: this.y }, thickness, color });
  }

  /** Rectangle dont le bord supérieur est à `yTop` (défaut : curseur). */
  rect(
    x: number,
    w: number,
    h: number,
    { yTop = this.y, fill, border, borderW = 1 }: { yTop?: number; fill?: RGB; border?: RGB; borderW?: number } = {},
  ): void {
    this.page.drawRectangle({
      x,
      y: yTop - h,
      width: w,
      height: h,
      color: fill,
      borderColor: border,
      borderWidth: border ? borderW : 0,
    });
  }

  async toBuffer(): Promise<Buffer> {
    const bytes = await this.pdf.save();
    return Buffer.from(bytes);
  }
}

export const showOr = (v: string | number | null | undefined): string =>
  v === null || v === undefined || v === '' ? '—' : String(v);

export const euros = (cents: number): string =>
  (cents / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
