import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AnimeApiService } from './anime-api.service';
import { PollDto, MultiPollAdminDto, MultiPollGroupDto, CharacterDto } from './api.types';

/** One participant circle inside a match/candidate card; char=null renders the TBD shield. */
interface Slot {
  name?:     string;
  sub?:      string;
  imageUrl?: string;
  dataUri?:  string;
  isWinner?: boolean;
}

/** One node of the symmetric knockout tree. */
interface KNode {
  slots:    Slot[];
  children: KNode[];
  depth:    number;
  boxH:     number;
  h:        number; // subtree height
  x:        number;
  cy:       number;
}

const GOLD       = '#eab308';
const LINE       = '#3f4c63';
const INK_SUB    = '#94a3b8';
const BG         = '#0b1120';
const BOX_FILL   = '#111827cc';
const BOX_STROKE = '#ffffff1a';

const SHIELD_PATH = 'M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z';

// knockout metrics
const MATCH_W  = 132;
const SLOT_H   = 82;
const MATCH_P  = 10;
const H_GAP    = 46;
const V_GAP    = 20;

// org-chart metrics
const CARD_W   = 128;
const CARD_H   = 118;
const CARD_GAP = 22;

const TITLE_H  = 74;
const PAD      = 42;

const FALLBACK_COLORS = ['#1565c0', '#c62828', '#2e7d32', '#6a1b9a', '#e65100'];

@Injectable({ providedIn: 'root' })
export class PollExportService {

  private readonly api = inject(AnimeApiService);

  /** Simple poll → same org chart as single-group multi-polls, champion = current vote leader. */
  async downloadPoll(poll: PollDto): Promise<void> {
    // leader from live results (null on tie / no votes → gold shield instead)
    let leaderId: string | null = null;
    try {
      const res = await firstValueFrom(this.api.getPollResult(poll.id));
      const sorted = [...res.fighterResults].sort((a, b) => b.votes - a.votes);
      if (sorted.length > 1 && sorted[0].votes > sorted[1].votes) leaderId = sorted[0].charId;
    } catch { /* results unavailable → render without champion */ }

    const slots: Slot[] = poll.fighters.map(f => ({
      name: f.name, sub: f.title ?? '', imageUrl: f.imageUrl, isWinner: f.id === leaderId,
    }));
    const leader = leaderId ? poll.fighters.find(f => f.id === leaderId) ?? null : null;
    const champ: Slot | null = leader ? { name: leader.name, imageUrl: leader.imageUrl } : null;
    const svg = await this.buildOrgChart(poll.question, poll.anime ?? '', null, slots, champ);
    await this.downloadJpeg(svg.svg, svg.w, svg.h, poll.id);
  }

  /** Single group → org chart; several groups → symmetric knockout like the cards. */
  async downloadMultiPoll(poll: MultiPollAdminDto): Promise<void> {
    if ((poll.groups ?? []).length === 1) {
      const g = poll.groups[0];
      const winner = g.winnerCharId ? g.candidates.find(c => c.id === g.winnerCharId) ?? null : null;
      const slots: Slot[] = g.candidates.map(c => ({
        name: c.name, sub: c.title ?? '', imageUrl: c.imageUrl, isWinner: g.winnerCharId === c.id,
      }));
      const champ: Slot | null = winner ? { name: winner.name, imageUrl: winner.imageUrl } : null;
      const svg = await this.buildOrgChart(poll.question, poll.anime ?? '', g.label, slots, champ);
      await this.downloadJpeg(svg.svg, svg.w, svg.h, poll.id);
      return;
    }
    const svg = await this.buildKnockout(poll);
    await this.downloadJpeg(svg.svg, svg.w, svg.h, poll.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ORG CHART (poll + single-group multi-poll)
  // ══════════════════════════════════════════════════════════════════════════

  private async buildOrgChart(
    question: string, anime: string, groupLabel: string | null,
    slots: Slot[], champion: Slot | null,
  ): Promise<{ svg: string; w: number; h: number }> {
    await this.resolveImages([...slots, ...(champion ? [champion] : [])]);

    const rowW    = slots.length * CARD_W + (slots.length - 1) * CARD_GAP;
    const w       = Math.max(rowW, 340) + PAD * 2;
    const rootW   = 104;
    const rootH   = champion ? 118 : 96;
    const rootX   = w / 2 - rootW / 2;
    const rootY   = TITLE_H + (groupLabel ? 22 : 0);
    const rowY    = rootY + rootH + 56;
    const h       = rowY + CARD_H + PAD;
    const rowX0   = w / 2 - rowW / 2;

    const defs:  string[] = [];
    const elems: string[] = [];

    // title
    elems.push(this.txt(question, w / 2, 34, '#fff', 15, 800, w - PAD));
    if (anime) elems.push(this.txt(anime.toUpperCase(), w / 2, 54, '#60a5fa', 10, 700, w - PAD));
    if (groupLabel) elems.push(this.txt(groupLabel, w / 2, TITLE_H + 8, INK_SUB, 11, 700, w - PAD));

    // winner root node (gold)
    elems.push(`<rect x="${rootX}" y="${rootY}" width="${rootW}" height="${rootH}" rx="12" fill="${GOLD}24" stroke="${GOLD}" stroke-width="1.5"/>`);
    if (champion) {
      this.drawAvatar(elems, defs, champion, w / 2, rootY + 42, 30, GOLD);
      elems.push(this.txt('👑', w / 2, rootY + 6, '#fff', 13, 700, rootW));
      elems.push(this.txt(champion.name ?? '', w / 2, rootY + 88, GOLD, 10.5, 800, rootW - 8));
    } else {
      elems.push(this.shield(w / 2, rootY + 40, 22, GOLD + 'bb'));
      elems.push(this.txt('Winner', w / 2, rootY + rootH - 18, GOLD, 11, 800, rootW));
    }

    // connectors + candidate cards
    const lines: string[] = [];
    slots.forEach((s, i) => {
      const cx = rowX0 + i * (CARD_W + CARD_GAP) + CARD_W / 2;
      const y1 = rootY + rootH, y2 = rowY, my = (y1 + y2) / 2;
      lines.push(`<path d="M${w / 2},${y1} C${w / 2},${my} ${cx},${my} ${cx},${y2}" stroke="${LINE}" stroke-width="2" fill="none"/>`);

      const x = rowX0 + i * (CARD_W + CARD_GAP);
      elems.push(`<rect x="${x}" y="${rowY}" width="${CARD_W}" height="${CARD_H}" rx="12" fill="${BOX_FILL}" stroke="${s.isWinner ? GOLD : BOX_STROKE}" stroke-width="${s.isWinner ? 1.5 : 1}"/>`);
      this.drawAvatar(elems, defs, s, cx, rowY + 38, 28, s.isWinner ? GOLD : '#ffffff33');
      if (s.isWinner) elems.push(this.txt('🏆', x + 16, rowY + 14, '#fff', 11, 700, 20));
      elems.push(this.txt(s.name ?? '', cx, rowY + 80, '#fff', 11.5, 700, CARD_W - 10));
      if (s.sub) elems.push(this.txt(s.sub, cx, rowY + 96, INK_SUB, 9.5, 400, CARD_W - 10));
    });

    return { svg: this.wrapSvg(w, h, defs, [...lines, ...elems], slots), w, h };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SYMMETRIC KNOCKOUT (multi-group multi-poll)
  // ══════════════════════════════════════════════════════════════════════════

  private async buildKnockout(poll: MultiPollAdminDto): Promise<{ svg: string; w: number; h: number }> {
    const groups = poll.groups ?? [];
    const byId   = new Map(groups.map(g => [g.id, g]));
    const maxLevel = groups.reduce((m, g) => Math.max(m, g.level ?? 0), 0);

    const slotsOf = (g: MultiPollGroupDto): Slot[] => {
      if (g.candidates.length > 0) {
        return g.candidates.map(c => ({
          name: c.name, imageUrl: c.imageUrl, isWinner: g.winnerCharId === c.id,
        }));
      }
      return (g.feederGroupIds ?? []).map(() => ({}));
    };

    const build = (g: MultiPollGroupDto, depth: number): KNode => ({
      slots: slotsOf(g),
      children: (g.feederGroupIds ?? [])
        .map(id => byId.get(id))
        .filter((f): f is MultiPollGroupDto => !!f)
        .map(f => build(f, depth + 1)),
      depth, boxH: 0, h: 0, x: 0, cy: 0,
    });

    // root: real final for brackets, synthetic Winner node for flat multi-group polls
    let root: KNode;
    let centerLabel = 'Winner';
    let champion: CharacterDto | null = null;
    if (maxLevel > 0) {
      const finals = groups.filter(g => g.level === maxLevel);
      root = finals.length === 1
        ? build(finals[0], 0)
        : { slots: finals.map(() => ({})), children: finals.map(f => build(f, 1)), depth: 0, boxH: 0, h: 0, x: 0, cy: 0 };
      centerLabel = 'Final';
      const final = finals.length === 1 ? finals[0] : null;
      champion = final?.winnerCharId ? final.candidates.find(c => c.id === final.winnerCharId) ?? null : null;
    } else {
      root = {
        slots: groups.map(g => {
          const winner = g.winnerCharId ? g.candidates.find(c => c.id === g.winnerCharId) : null;
          return winner ? { name: winner.name, imageUrl: winner.imageUrl, isWinner: true } : {};
        }),
        children: groups.map(g => build(g, 1)),
        depth: 0, boxH: 0, h: 0, x: 0, cy: 0,
      };
    }

    // resolve images for every slot
    const allSlots: Slot[] = [];
    const walk = (n: KNode) => { allSlots.push(...n.slots); n.children.forEach(walk); };
    walk(root);
    const champSlot: Slot | null = champion ? { name: champion.name, imageUrl: champion.imageUrl } : null;
    await this.resolveImages([...allSlots, ...(champSlot ? [champSlot] : [])]);

    // split children left/right, measure
    const half  = Math.ceil(root.children.length / 2);
    const left  = root.children.slice(0, half);
    const right = root.children.slice(half);

    const measure = (n: KNode): void => {
      n.boxH = MATCH_P * 2 + Math.max(n.slots.length, 1) * SLOT_H;
      n.children.forEach(measure);
      const kids = n.children.reduce((s, c) => s + c.h, 0) + V_GAP * Math.max(n.children.length - 1, 0);
      n.h = Math.max(n.boxH, kids);
    };
    measure(root);
    left.forEach(measure); right.forEach(measure);

    const depthOf  = (ns: KNode[]): number => ns.length === 0 ? 0 : Math.max(...ns.map(n => 1 + depthOf(n.children)));
    const leftD    = depthOf(left);
    const rightD   = depthOf(right);
    const sideH    = (ns: KNode[]) => ns.reduce((s, n) => s + n.h, 0) + V_GAP * Math.max(ns.length - 1, 0);
    const boardH   = Math.max(sideH(left), sideH(right), root.boxH);
    const w        = PAD * 2 + leftD * (MATCH_W + H_GAP) + MATCH_W + rightD * (MATCH_W + H_GAP);
    const topY     = TITLE_H + (champion ? 66 : 30);
    const h        = topY + boardH + PAD;
    const centerX  = PAD + leftD * (MATCH_W + H_GAP);

    // y placement
    const assignY = (n: KNode, top: number): void => {
      if (n.children.length === 0) { n.cy = top + n.h / 2; return; }
      let t = top + (n.h - (n.children.reduce((s, c) => s + c.h, 0) + V_GAP * (n.children.length - 1))) / 2;
      for (const c of n.children) { assignY(c, t); t += c.h + V_GAP; }
      n.cy = (n.children[0].cy + n.children[n.children.length - 1].cy) / 2;
    };
    const placeSide = (ns: KNode[]) => {
      let t = topY + (boardH - sideH(ns)) / 2;
      for (const n of ns) { assignY(n, t); t += n.h + V_GAP; }
    };
    placeSide(left); placeSide(right);
    root.cy = topY + boardH / 2;

    // x placement (depth 1 = adjacent to center)
    const placeX = (n: KNode, side: 'L' | 'R'): void => {
      n.x = side === 'L'
        ? centerX - n.depth * (MATCH_W + H_GAP)
        : centerX + n.depth * (MATCH_W + H_GAP);
      n.children.forEach(c => placeX(c, side));
    };
    left.forEach(n => placeX(n, 'L'));
    right.forEach(n => placeX(n, 'R'));
    root.x = centerX;

    const defs:  string[] = [];
    const lines: string[] = [];
    const elems: string[] = [];

    // title
    elems.push(this.txt(poll.question, w / 2, 34, '#fff', 15, 800, w - PAD));
    if (poll.anime) elems.push(this.txt(poll.anime.toUpperCase(), w / 2, 54, '#60a5fa', 10, 700, w - PAD));

    // connectors (elbows through the middle of the gap)
    const connect = (parent: KNode, child: KNode, side: 'L' | 'R') => {
      const px = side === 'L' ? parent.x : parent.x + MATCH_W;
      const cx = side === 'L' ? child.x + MATCH_W : child.x;
      const rail = side === 'L' ? px - H_GAP / 2 : px + H_GAP / 2;
      lines.push(`<path d="M${cx},${child.cy} H${rail} V${parent.cy} H${px}" stroke="${LINE}" stroke-width="2" fill="none"/>`);
    };
    const drawTree = (n: KNode, side: 'L' | 'R') => {
      this.drawMatch(elems, defs, n, false);
      for (const c of n.children) { connect(n, c, side); drawTree(c, side); }
    };
    left.forEach(n => { connect(root, n, 'L'); drawTree(n, 'L'); });
    right.forEach(n => { connect(root, n, 'R'); drawTree(n, 'R'); });

    // center node (gold) + label / champion
    this.drawMatch(elems, defs, root, true);
    const rootTop = root.cy - root.boxH / 2;
    if (champSlot) {
      this.drawAvatar(elems, defs, champSlot, centerX + MATCH_W / 2, rootTop - 44, 26, GOLD);
      elems.push(this.txt('👑', centerX + MATCH_W / 2, rootTop - 78, '#fff', 12, 700, MATCH_W));
      elems.push(this.txt(champSlot.name ?? '', centerX + MATCH_W / 2, rootTop - 8, GOLD, 10.5, 800, MATCH_W + 30));
    } else {
      elems.push(this.txt(centerLabel, centerX + MATCH_W / 2, rootTop - 12, GOLD, 12, 800, MATCH_W));
    }

    return { svg: this.wrapSvg(w, h, defs, [...lines, ...elems], allSlots), w, h };
  }

  private drawMatch(elems: string[], defs: string[], n: KNode, isCenter: boolean): void {
    const top = n.cy - n.boxH / 2;
    elems.push(`<rect x="${n.x}" y="${top}" width="${MATCH_W}" height="${n.boxH}" rx="14" ` +
      (isCenter
        ? `fill="${GOLD}24" stroke="${GOLD}" stroke-width="1.5"/>`
        : `fill="${BOX_FILL}" stroke="${BOX_STROKE}" stroke-width="1"/>`));
    n.slots.forEach((s, i) => {
      const cy = top + MATCH_P + i * SLOT_H + 30;
      const cx = n.x + MATCH_W / 2;
      if (s.dataUri) {
        this.drawAvatar(elems, defs, s, cx, cy, 24, s.isWinner ? GOLD : '#ffffff33');
        elems.push(this.txt(s.name ?? '', cx, cy + 38, s.isWinner ? GOLD : '#fff', 10, 700, MATCH_W - 12));
      } else {
        elems.push(this.shield(cx, cy, 18, isCenter ? GOLD + 'bb' : '#ffffff2e'));
        elems.push(this.txt('TBD', cx, cy + 38, INK_SUB, 9.5, 700, MATCH_W - 12));
      }
    });
  }

  // ── Shared drawing helpers ────────────────────────────────────────────────

  private drawAvatar(elems: string[], defs: string[], s: Slot, cx: number, cy: number, r: number, ring: string): void {
    const uid = `cl${Math.round(cx)}_${Math.round(cy)}`;
    defs.push(`<clipPath id="${uid}"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>`);
    elems.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1a1a2e"/>`);
    if (s.dataUri) {
      elems.push(`<image href="${s.dataUri}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" preserveAspectRatio="xMidYMin slice" clip-path="url(#${uid})"/>`);
    }
    elems.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${ring}" stroke-width="2"/>`);
  }

  private shield(cx: number, cy: number, size: number, fill: string): string {
    const s = size / 12; // path is on a 24x24 grid centered at 12,12
    return `<path d="${SHIELD_PATH}" transform="translate(${cx - 12 * s},${cy - 12 * s}) scale(${s})" fill="${fill}"/>`;
  }

  private wrapSvg(w: number, h: number, defs: string[], body: string[], slots: Slot[]): string {
    const bgImages = slots.map(s => s.dataUri).filter((u): u is string => !!u).slice(0, 8);
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
    <filter id="bg-blur" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="20"/></filter>
    ${defs.join('\n    ')}
  </defs>
  <rect width="${w}" height="${h}" fill="${BG}"/>
  ${bgLayer}
  <rect width="${w}" height="${h}" fill="${BG}" opacity="0.68"/>
  ${body.join('\n  ')}
</svg>`;
  }

  private txt(raw: string, x: number, y: number, fill: string, size: number, weight: number, maxW: number): string {
    const max  = Math.floor(maxW / (size * 0.58));
    const text = raw.length > max ? raw.slice(0, Math.max(max - 1, 1)) + '…' : raw;
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle" fill="${fill}" font-size="${size}" font-weight="${weight}" font-family="system-ui,ui-sans-serif,sans-serif">${this.esc(text)}</text>`;
  }

  private esc(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ── Image resolution ──────────────────────────────────────────────────────

  private async resolveImages(slots: Slot[]): Promise<void> {
    const pending = slots.filter(s => s.imageUrl && !s.dataUri);
    await Promise.allSettled(
      pending.map((s, i) =>
        this.toDataUri(s.imageUrl!)
          .then(uri => { s.dataUri = uri; })
          .catch(()  => { s.dataUri = this.fallbackUri(s.name ?? '?', FALLBACK_COLORS[i % FALLBACK_COLORS.length]); })
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

  private fallbackUri(name: string, bg: string): string {
    const ini = name.split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><circle cx="30" cy="30" r="30" fill="${bg}"/><text x="30" y="30" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="20" font-weight="700" font-family="sans-serif">${ini}</text></svg>`;
    return 'data:image/svg+xml;base64,' + btoa(svg);
  }

  // ── JPEG output ───────────────────────────────────────────────────────────

  private async downloadJpeg(svg: string, w: number, h: number, id: string): Promise<void> {
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url  = URL.createObjectURL(blob);
    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload  = () => resolve();
        img.onerror = () => reject(new Error('Failed to rasterize export image'));
        img.src = url;
      });
      const scale  = 2; // crisp on retina screens
      const canvas = document.createElement('canvas');
      canvas.width  = w * scale;
      canvas.height = h * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/jpeg', 0.92);
      a.download = `${id}.jpg`;
      a.click();
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }
}
