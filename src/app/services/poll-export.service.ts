import { Injectable } from '@angular/core';
import { PollDto, MultiPollAdminDto } from './api.types';

interface TreeNode {
  label:    string;
  sublabel: string;
  level:    number;
  children: TreeNode[];
  // computed by layout pass
  treeWidth: number;
  x: number;
  y: number;
}

const BOX_W = 168;
const BOX_H = 64;
const H_GAP = 28;
const V_GAP = 72;
const PAD   = 48;

const LEVEL_COLORS = ['#1565c0', '#6b21a8', '#0f766e', '#374151'];

@Injectable({ providedIn: 'root' })
export class PollExportService {

  downloadPoll(poll: PollDto): void {
    const root: TreeNode = {
      label: poll.question, sublabel: poll.anime ?? '', level: 0,
      children: poll.fighters.map(f => ({
        label: f.name, sublabel: f.title ?? '',
        level: 1, children: [], treeWidth: 0, x: 0, y: 0,
      })),
      treeWidth: 0, x: 0, y: 0,
    };
    this.export(root, poll.id);
  }

  downloadMultiPoll(poll: MultiPollAdminDto): void {
    const root: TreeNode = {
      label: poll.question, sublabel: poll.anime ?? '', level: 0,
      children: poll.groups.map(g => ({
        label: g.label, sublabel: '',
        level: 1,
        children: g.candidates.map(c => ({
          label: c.name, sublabel: c.title ?? '',
          level: 2, children: [], treeWidth: 0, x: 0, y: 0,
        })),
        treeWidth: 0, x: 0, y: 0,
      })),
      treeWidth: 0, x: 0, y: 0,
    };
    this.export(root, poll.id);
  }

  private export(root: TreeNode, id: string): void {
    this.computeWidths(root);
    const svgW = root.treeWidth + PAD * 2;
    const svgH = (this.depth(root) + 1) * (BOX_H + V_GAP) + PAD;
    this.assignPositions(root, PAD, PAD);

    const svg  = this.buildSvg(root, svgW, svgH);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `${id}-hierarchy.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private computeWidths(node: TreeNode): void {
    if (!node.children.length) { node.treeWidth = BOX_W; return; }
    node.children.forEach(c => this.computeWidths(c));
    const total = node.children.reduce((s, c) => s + c.treeWidth, 0)
                + H_GAP * (node.children.length - 1);
    node.treeWidth = Math.max(BOX_W, total);
  }

  private assignPositions(node: TreeNode, x: number, y: number): void {
    node.x = x + (node.treeWidth - BOX_W) / 2;
    node.y = y;
    let cx = x;
    for (const child of node.children) {
      this.assignPositions(child, cx, y + BOX_H + V_GAP);
      cx += child.treeWidth + H_GAP;
    }
  }

  private depth(node: TreeNode): number {
    if (!node.children.length) return 0;
    return 1 + Math.max(...node.children.map(c => this.depth(c)));
  }

  private buildSvg(root: TreeNode, w: number, h: number): string {
    const lines: string[] = [];
    const boxes: string[] = [];
    this.collectLines(root, lines);
    this.collectBoxes(root, boxes);

    const gradients = LEVEL_COLORS.map((col, i) => `
    <linearGradient id="g${i}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${col}e6"/>
      <stop offset="100%" stop-color="${col}99"/>
    </linearGradient>`).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>${gradients}
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  ${lines.join('\n  ')}
  ${boxes.join('\n  ')}
</svg>`;
  }

  private collectLines(node: TreeNode, out: string[]): void {
    const cx = node.x + BOX_W / 2;
    const cy = node.y + BOX_H;
    for (const child of node.children) {
      const tx = child.x + BOX_W / 2;
      const ty = child.y;
      const my = (cy + ty) / 2;
      out.push(`<path d="M${cx},${cy} C${cx},${my} ${tx},${my} ${tx},${ty}" stroke="#475569" stroke-width="1.5" fill="none"/>`);
      this.collectLines(child, out);
    }
  }

  private collectBoxes(node: TreeNode, out: string[]): void {
    const lvl = Math.min(node.level, LEVEL_COLORS.length - 1);
    const { x, y } = node;
    out.push(`<rect x="${x}" y="${y}" width="${BOX_W}" height="${BOX_H}" rx="10" fill="url(#g${lvl})" stroke="#ffffff1a" stroke-width="1"/>`);

    const hasSubLabel = !!node.sublabel;
    const labelY = y + (hasSubLabel ? BOX_H / 2 - 6 : BOX_H / 2 + 4);
    out.push(this.svgText(node.label, x + BOX_W / 2, labelY, '#ffffff', 12, 600));

    if (hasSubLabel) {
      out.push(this.svgText(node.sublabel, x + BOX_W / 2, y + BOX_H / 2 + 11, '#94a3b8', 9.5, 400));
    }

    for (const child of node.children) this.collectBoxes(child, out);
  }

  private svgText(raw: string, x: number, y: number, fill: string, size: number, weight: number): string {
    const max = Math.floor(BOX_W / (size * 0.6));
    const text = raw.length > max ? raw.slice(0, max - 1) + '…' : raw;
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="system-ui,ui-sans-serif,sans-serif">${this.esc(text)}</text>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
}
