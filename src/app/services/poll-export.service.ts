import { Injectable } from '@angular/core';
import { PollDto, MultiPollAdminDto } from './api.types';

interface TreeNode {
  label:    string;
  sublabel: string;
  imageUrl?: string; // '?' = question-mark sentinel (root), real url = character
  dataUri?:  string; // resolved async or pre-built
  level:    number;
  children: TreeNode[];
  // layout
  treeWidth: number;
  x: number;
  y: number;
}

const BOX_W     = 148;
const BOX_H_IMG = 114; // node with avatar circle
const BOX_H_TXT = 64;  // group-label nodes (no avatar)
const AVATAR_R  = 28;
const H_GAP     = 24;
const V_GAP     = 76;
const PAD       = 48;

const LEVEL_COLORS    = ['#1565c0', '#6b21a8', '#0f766e', '#374151'];
const FALLBACK_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

@Injectable({ providedIn: 'root' })
export class PollExportService {

  async downloadPoll(poll: PollDto): Promise<void> {
    const root: TreeNode = {
      label: poll.question, sublabel: poll.anime ?? '',
      level: 0,
      imageUrl: '?',                     // sentinel → avatar height
      dataUri:  this.questionMarkUri(),  // pre-built, skip fetch
      children: poll.fighters.map(f => ({
        label: f.name, sublabel: f.title ?? '', imageUrl: f.imageUrl,
        level: 1, children: [], treeWidth: 0, x: 0, y: 0,
      })),
      treeWidth: 0, x: 0, y: 0,
    };
    await this.run(root, poll.id);
  }

  async downloadMultiPoll(poll: MultiPollAdminDto): Promise<void> {
    const root: TreeNode = {
      label: poll.question, sublabel: poll.anime ?? '',
      level: 0,
      imageUrl: '?',
      dataUri:  this.questionMarkUri(),
      children: poll.groups.map(g => ({
        label: g.label, sublabel: '',
        level: 1,
        children: g.candidates.map(c => ({
          label: c.name, sublabel: c.title ?? '', imageUrl: c.imageUrl,
          level: 2, children: [], treeWidth: 0, x: 0, y: 0,
        })),
        treeWidth: 0, x: 0, y: 0,
      })),
      treeWidth: 0, x: 0, y: 0,
    };
    await this.run(root, poll.id);
  }

  // ── Core pipeline ─────────────────────────────────────────────────────────

  private async run(root: TreeNode, id: string): Promise<void> {
    await this.loadAllImages(root);

    this.computeWidths(root);
    const svgW = root.treeWidth + PAD * 2;
    const svgH = this.treeBottom(root, PAD) + PAD;
    this.assignPositions(root, PAD, PAD);

    // Collect character data-URIs for the blurred background (skip root sentinel)
    const bgImages: string[] = [];
    this.walk(root, n => { if (n.dataUri && n.imageUrl !== '?') bgImages.push(n.dataUri); });

    const svg = this.buildSvg(root, svgW, svgH, bgImages);
    this.triggerDownload(svg, `${id}-hierarchy.svg`);
  }

  private async loadAllImages(root: TreeNode): Promise<void> {
    const nodes: TreeNode[] = [];
    // Skip nodes that already have a pre-built dataUri (root "?" sentinel)
    this.walk(root, n => { if (n.imageUrl && !n.dataUri) nodes.push(n); });
    await Promise.allSettled(
      nodes.map((n, i) =>
        this.toDataUri(n.imageUrl!)
          .then(uri => { n.dataUri = uri; })
          .catch(()  => { n.dataUri = this.fallbackUri(n.label, FALLBACK_COLORS[i % FALLBACK_COLORS.length]); })
      )
    );
  }

  private async toDataUri(url: string): Promise<string> {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    return new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload  = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(blob);
    });
  }

  private questionMarkUri(): string {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="30" cy="30" r="30" fill="#1e3a5f" stroke="#60a5fa" stroke-width="2"/><text x="30" y="30" text-anchor="middle" dominant-baseline="middle" fill="#60a5fa" font-size="26" font-weight="700" font-family="sans-serif">?</text></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  private fallbackUri(name: string, bg: string): string {
    const ini = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="30" cy="30" r="30" fill="${bg}"/><text x="30" y="30" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="20" font-weight="700" font-family="sans-serif">${ini}</text></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // ── Layout ────────────────────────────────────────────────────────────────

  private bh(n: TreeNode): number { return n.imageUrl ? BOX_H_IMG : BOX_H_TXT; }

  private computeWidths(n: TreeNode): void {
    if (!n.children.length) { n.treeWidth = BOX_W; return; }
    n.children.forEach(c => this.computeWidths(c));
    const total = n.children.reduce((s, c) => s + c.treeWidth, 0) + H_GAP * (n.children.length - 1);
    n.treeWidth = Math.max(BOX_W, total);
  }

  private treeBottom(n: TreeNode, y: number): number {
    const bottom = y + this.bh(n);
    if (!n.children.length) return bottom;
    return Math.max(...n.children.map(c => this.treeBottom(c, bottom + V_GAP)));
  }

  private assignPositions(n: TreeNode, x: number, y: number): void {
    n.x = x + (n.treeWidth - BOX_W) / 2;
    n.y = y;
    let cx = x;
    for (const child of n.children) {
      this.assignPositions(child, cx, y + this.bh(n) + V_GAP);
      cx += child.treeWidth + H_GAP;
    }
  }

  // ── SVG generation ────────────────────────────────────────────────────────

  private buildSvg(root: TreeNode, w: number, h: number, bgImages: string[]): string {
    const lines: string[] = [];
    const defs:  string[] = [];
    const elems: string[] = [];

    this.collectLines(root, lines);
    this.collectElems(root, elems, defs);

    // Level-color gradients for boxes
    const levelGrad = LEVEL_COLORS.map((col, i) => `
    <linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}ee"/>
      <stop offset="100%" stop-color="${col}99"/>
    </linearGradient>`).join('');

    // Blur filter for background images
    const blurFilter = `<filter id="bg-blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="20"/>
    </filter>`;

    // Blurred background layer — slice the SVG width evenly among characters
    let bgLayer = '';
    if (bgImages.length > 0) {
      const sliceW = Math.ceil(w / bgImages.length);
      const imgs = bgImages.map((uri, i) =>
        `<image href="${uri}" x="${i * sliceW}" y="0" width="${sliceW}" height="${h}" preserveAspectRatio="xMidYMid slice"/>`
      ).join('\n  ');
      bgLayer = `<g filter="url(#bg-blur)" opacity="0.42">\n  ${imgs}\n</g>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    ${blurFilter}${levelGrad}
    ${defs.join('\n    ')}
  </defs>

  <!-- base dark fill -->
  <rect width="${w}" height="${h}" fill="#0b1120"/>

  <!-- blurred character photos -->
  ${bgLayer}

  <!-- dark overlay to keep tree readable -->
  <rect width="${w}" height="${h}" fill="#0b1120" opacity="0.68"/>

  <!-- connector lines -->
  ${lines.join('\n  ')}

  <!-- nodes -->
  ${elems.join('\n  ')}
</svg>`;
  }

  private collectLines(n: TreeNode, out: string[]): void {
    const x1 = n.x + BOX_W / 2, y1 = n.y + this.bh(n);
    for (const c of n.children) {
      const x2 = c.x + BOX_W / 2, y2 = c.y, my = (y1 + y2) / 2;
      out.push(`<path d="M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}" stroke="#475569" stroke-width="1.5" fill="none"/>`);
      this.collectLines(c, out);
    }
  }

  private collectElems(n: TreeNode, out: string[], defs: string[]): void {
    const lvl = Math.min(n.level, LEVEL_COLORS.length - 1);
    const { x, y } = n;
    const bh = this.bh(n);

    out.push(`<rect x="${x}" y="${y}" width="${BOX_W}" height="${bh}" rx="10" fill="url(#g${lvl})" stroke="#ffffff1a" stroke-width="1"/>`);

    if (n.dataUri) {
      // Avatar circle (character photo or "?" for root)
      const cx  = x + BOX_W / 2;
      const cy  = y + AVATAR_R + 10;
      const uid = `cl${Math.round(x)}_${Math.round(y)}`;
      defs.push(`<clipPath id="${uid}"><circle cx="${cx}" cy="${cy}" r="${AVATAR_R}"/></clipPath>`);
      out.push(`<image href="${n.dataUri}" x="${cx - AVATAR_R}" y="${cy - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${uid})"/>`);
      out.push(`<circle cx="${cx}" cy="${cy}" r="${AVATAR_R}" fill="none" stroke="#ffffff33" stroke-width="1.5"/>`);
      out.push(this.txt(n.label,    cx, cy + AVATAR_R + 14, '#fff',     11.5, 700));
      if (n.sublabel) out.push(this.txt(n.sublabel, cx, cy + AVATAR_R + 28, '#94a3b8', 9.5, 400));
    } else {
      // Text-only (group-label nodes in multi-poll)
      const mid = y + bh / 2;
      out.push(this.txt(n.label,    x + BOX_W / 2, n.sublabel ? mid - 7 : mid, '#fff',     12, 700));
      if (n.sublabel) out.push(this.txt(n.sublabel, x + BOX_W / 2, mid + 8, '#94a3b8', 9.5, 400));
    }

    for (const c of n.children) this.collectElems(c, out, defs);
  }

  private txt(raw: string, x: number, y: number, fill: string, size: number, weight: number): string {
    const max  = Math.floor(BOX_W / (size * 0.6));
    const text = raw.length > max ? raw.slice(0, max - 1) + '…' : raw;
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="system-ui,ui-sans-serif,sans-serif">${this.esc(text)}</text>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  private walk(n: TreeNode, fn: (n: TreeNode) => void): void {
    fn(n); n.children.forEach(c => this.walk(c, fn));
  }

  private triggerDownload(svg: string, filename: string): void {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
