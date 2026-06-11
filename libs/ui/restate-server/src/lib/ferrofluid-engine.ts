import { noise2D } from './noise';

const TWO_PI = Math.PI * 2;

export type FerrofluidStatus =
  | 'idle'
  | 'active'
  | 'pause'
  | 'warning'
  | 'danger';

interface Metaball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  baseAngle: number;
  orbitRadius: number;
  orbitSpeed: number;
  noisePhase: number;
  hueOffset: number;
}

interface StatusParams {
  spread: number;
  speedMul: number;
  noiseAmp: number;
  noiseSpeed: number;
}

const STATUS_PARAMS: Record<FerrofluidStatus, StatusParams> = {
  idle: { spread: 1.4, speedMul: 0.5, noiseAmp: 10, noiseSpeed: 0.5 },
  active: { spread: 2.2, speedMul: 1.5, noiseAmp: 18, noiseSpeed: 1.1 },
  pause: { spread: 0.3, speedMul: 0.05, noiseAmp: 1.5, noiseSpeed: 0.1 },
  warning: { spread: 1.8, speedMul: 0.8, noiseAmp: 14, noiseSpeed: 0.7 },
  danger: { spread: 1.8, speedMul: 0.8, noiseAmp: 14, noiseSpeed: 0.7 },
};

const STATUS_HUE: Record<FerrofluidStatus, number> = {
  idle: 235,
  active: 235,
  pause: 235,
  warning: 35,
  danger: 0,
};

const SPRING = 0.012;
const DAMPING = 0.965;
const LERP = 0.02;

const GOO_INFLUENCE = 1.6;
const GOO_THRESHOLD_LOW = 0.39;
const GOO_THRESHOLD_HIGH = 0.46;
const FIELD_DETAIL = 0.5;
const SHAPE_SATURATION = 20;
const SHAPE_LIGHTNESS = 65;

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const hue = ((h % 360) + 360) % 360;
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const hp = hue / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) [r, g, b] = [c, x, 0];
  else if (hp < 2) [r, g, b] = [x, c, 0];
  else if (hp < 3) [r, g, b] = [0, c, x];
  else if (hp < 4) [r, g, b] = [0, x, c];
  else if (hp < 5) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const m = light - c / 2;
  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255),
  ];
}

export class FerrofluidEngine {
  private shapeCanvas: HTMLCanvasElement | null = null;
  private colorCanvas: HTMLCanvasElement | null = null;
  private shapeCtx: CanvasRenderingContext2D | null = null;
  private colorCtx: CanvasRenderingContext2D | null = null;
  private dpr = 1;
  private _logicalSize = 0;
  private cx = 0;
  private cy = 0;
  private baseRadius = 0;
  private metaballs: Metaball[] = [];
  private time = 0;
  private animationId: number | null = null;
  private _status: FerrofluidStatus = 'idle';
  private mousePos: { x: number; y: number } | null = null;
  private mouseVelocity = 0;
  private curSpread = STATUS_PARAMS.idle.spread;
  private curSpeed = STATUS_PARAMS.idle.speedMul;
  private curNoiseAmp = STATUS_PARAMS.idle.noiseAmp;
  private curNoiseSpeed = STATUS_PARAMS.idle.noiseSpeed;
  private curHue = STATUS_HUE.idle;
  private nextJolt = 0;
  private fieldCanvas: HTMLCanvasElement | null = null;
  private fieldCtx: CanvasRenderingContext2D | null = null;
  private fieldImage: ImageData | null = null;
  private fieldSize = 0;
  private ballFieldX = new Float32Array(0);
  private ballFieldY = new Float32Array(0);
  private ballFieldR2 = new Float32Array(0);
  private ballFieldInvR2 = new Float32Array(0);
  private unwatchDpr: (() => void) | null = null;

  public isInitialized = false;

  get logicalSize() {
    return this._logicalSize;
  }

  get status() {
    return this._status;
  }

  set status(value: FerrofluidStatus) {
    this._status = value;
    if (this.shapeCanvas) this.shapeCanvas.dataset.status = value;
  }

  init(shapeCanvas: HTMLCanvasElement, colorCanvas: HTMLCanvasElement) {
    this.shapeCanvas = shapeCanvas;
    this.colorCanvas = colorCanvas;
    this._logicalSize = shapeCanvas.clientWidth;

    this.shapeCtx = shapeCanvas.getContext('2d');
    this.colorCtx = colorCanvas.getContext('2d');

    this.cx = this._logicalSize / 2;
    this.cy = this._logicalSize / 2;
    this.baseRadius = this._logicalSize * 0.42;

    this.configureResolution();
    this.watchDpr();
    this.createMetaballs();
    this.isInitialized = true;
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  cleanup() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.unwatchDpr?.();
    this.unwatchDpr = null;
    this.isInitialized = false;
    this.metaballs = [];
    this.shapeCanvas = null;
    this.colorCanvas = null;
    this.shapeCtx = null;
    this.colorCtx = null;
    this.fieldCanvas = null;
    this.fieldCtx = null;
    this.fieldImage = null;
    this.mousePos = null;
    this.mouseVelocity = 0;
  }

  private configureResolution() {
    this.dpr = window.devicePixelRatio || 1;
    const size = this._logicalSize;

    for (const [canvas, ctx] of [
      [this.shapeCanvas, this.shapeCtx],
      [this.colorCanvas, this.colorCtx],
    ] as const) {
      if (!canvas || !ctx) continue;
      canvas.width = size * this.dpr;
      canvas.height = size * this.dpr;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    }

    const detail = Math.min(1, FIELD_DETAIL * Math.max(1, this.dpr / 2));
    this.fieldSize = Math.max(24, Math.round(size * detail));
    this.fieldCanvas = this.fieldCanvas ?? document.createElement('canvas');
    this.fieldCanvas.width = this.fieldSize;
    this.fieldCanvas.height = this.fieldSize;
    this.fieldCtx = this.fieldCanvas.getContext('2d');
    this.fieldImage =
      this.fieldCtx?.createImageData(this.fieldSize, this.fieldSize) ?? null;
  }

  private watchDpr() {
    this.unwatchDpr?.();
    this.unwatchDpr = null;
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(`(resolution: ${this.dpr}dppx)`);
    const onChange = () => {
      if (!this.isInitialized) return;
      this.configureResolution();
      this.watchDpr();
    };
    query.addEventListener('change', onChange);
    this.unwatchDpr = () => query.removeEventListener('change', onChange);
  }

  mouseMove(nx: number, ny: number) {
    if (this._status === 'pause') return;
    const pos = { x: nx * this._logicalSize, y: ny * this._logicalSize };
    if (this.mousePos) {
      const dx = pos.x - this.mousePos.x;
      const dy = pos.y - this.mousePos.y;
      this.mouseVelocity = Math.sqrt(dx * dx + dy * dy);
    }
    this.mousePos = pos;
  }

  mouseLeave() {
    this.mousePos = null;
    this.mouseVelocity = 0;
  }

  click(nx: number, ny: number) {
    if (this._status === 'pause') return;
    const px = nx * this._logicalSize;
    const py = ny * this._logicalSize;
    const range = this.baseRadius * 2;

    for (const b of this.metaballs) {
      const dx = b.x - px;
      const dy = b.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= range) continue;

      const strength = 1 - dist / range;
      const force = strength * strength * this.baseRadius * 0.2;
      if (dist > 0.5) {
        b.vx += (dx / dist) * force;
        b.vy += (dy / dist) * force;
      } else {
        const angle = Math.random() * TWO_PI;
        b.vx += Math.cos(angle) * force;
        b.vy += Math.sin(angle) * force;
      }
    }
  }

  private createMetaballs() {
    const { cx, cy, baseRadius: r } = this;
    this.metaballs = [];

    this.addBall(cx, cy, r * 0.55, 0, 0, 0, 0);

    for (let i = 0; i < 3; i++) {
      const a = (TWO_PI / 3) * i + Math.random() * 0.5;
      this.addBall(
        cx + Math.cos(a) * r * 0.1,
        cy + Math.sin(a) * r * 0.1,
        r * 0.34,
        a,
        r * 0.22,
        0.3 + i * 0.15,
        30 + i * 25,
      );
    }

    for (let i = 0; i < 5; i++) {
      const a = (TWO_PI / 5) * i + Math.random() * 0.3;
      this.addBall(
        cx + Math.cos(a) * r * 0.15,
        cy + Math.sin(a) * r * 0.15,
        r * 0.16,
        a,
        r * 0.4,
        0.45 + i * 0.1,
        15 + i * 18,
      );
    }

    for (let i = 0; i < 4; i++) {
      const a = (TWO_PI / 4) * i + Math.random();
      this.addBall(
        cx + Math.cos(a) * r * 0.2,
        cy + Math.sin(a) * r * 0.2,
        r * 0.1,
        a,
        r * 0.5,
        0.6 + i * 0.12,
        40 + i * 20,
      );
    }

    const count = this.metaballs.length;
    this.ballFieldX = new Float32Array(count);
    this.ballFieldY = new Float32Array(count);
    this.ballFieldR2 = new Float32Array(count);
    this.ballFieldInvR2 = new Float32Array(count);
  }

  private addBall(
    x: number,
    y: number,
    radius: number,
    baseAngle: number,
    orbitRadius: number,
    orbitSpeed: number,
    hueOffset: number,
  ) {
    this.metaballs.push({
      x,
      y,
      vx: 0,
      vy: 0,
      radius,
      baseAngle,
      orbitRadius,
      orbitSpeed,
      noisePhase: Math.random() * 100,
      hueOffset,
    });
  }

  private loop(timestamp: number) {
    if (!this.shapeCtx || !this.colorCtx) return;
    this.time = timestamp * 0.001;
    this.interpolateParams();
    this.updatePhysics();
    this.draw();
    this.mouseVelocity *= 0.92;
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  private interpolateParams() {
    const t = STATUS_PARAMS[this._status];
    this.curSpread += (t.spread - this.curSpread) * LERP;
    this.curSpeed += (t.speedMul - this.curSpeed) * LERP;
    this.curNoiseAmp += (t.noiseAmp - this.curNoiseAmp) * LERP;
    this.curNoiseSpeed += (t.noiseSpeed - this.curNoiseSpeed) * LERP;
    const targetHue = STATUS_HUE[this._status];
    this.curHue += (targetHue - this.curHue) * 0.08;
  }

  private updatePhysics() {
    const {
      cx,
      cy,
      baseRadius,
      time,
      curSpread,
      curSpeed,
      curNoiseAmp,
      curNoiseSpeed,
    } = this;
    const softMax = this._logicalSize * 0.38;
    const hardMax = this._logicalSize * 0.45;

    for (const b of this.metaballs) {
      b.baseAngle += b.orbitSpeed * curSpeed * 0.016;

      const n1x = noise2D(b.noisePhase, time * curNoiseSpeed * 0.3);
      const n1y = noise2D(b.noisePhase + 50, time * curNoiseSpeed * 0.3);
      const n2x = noise2D(b.noisePhase + 100, time * curNoiseSpeed * 0.5);
      const n2y = noise2D(b.noisePhase + 150, time * curNoiseSpeed * 0.5);

      const tx =
        cx +
        Math.cos(b.baseAngle) * b.orbitRadius * curSpread +
        n1x * curNoiseAmp +
        n2x * curNoiseAmp * 0.3;
      const ty =
        cy +
        Math.sin(b.baseAngle) * b.orbitRadius * curSpread +
        n1y * curNoiseAmp +
        n2y * curNoiseAmp * 0.3;

      b.vx += (tx - b.x) * SPRING;
      b.vy += (ty - b.y) * SPRING;

      if (
        (this._status === 'danger' || this._status === 'warning') &&
        time > this.nextJolt
      ) {
        const angle = Math.random() * TWO_PI;
        b.vx += Math.cos(angle) * 2 * (0.5 + Math.random());
        b.vy += Math.sin(angle) * 2 * (0.5 + Math.random());
        if (b === this.metaballs[this.metaballs.length - 1]) {
          this.nextJolt = time + 0.4 + Math.random() * 2.5;
        }
      }

      if (this.mousePos && this._status !== 'pause' && this.mouseVelocity > 1) {
        const mdx = b.x - this.mousePos.x;
        const mdy = b.y - this.mousePos.y;
        const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
        if (mDist > 0.5) {
          const influence = Math.max(0, 1 - mDist / (baseRadius * 1.5));
          const speed = Math.min(this.mouseVelocity / 10, 1);
          const push = influence * influence * speed * 0.5;
          b.vx += (mdx / mDist) * push;
          b.vy += (mdy / mDist) * push;
        }
      }

      let dx = b.x - cx;
      let dy = b.y - cy;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > softMax) {
        const over = (dist - softMax) / softMax;
        b.vx -= (dx / dist) * over * 0.3 * dist;
        b.vy -= (dy / dist) * over * 0.3 * dist;
      }

      b.vx *= DAMPING;
      b.vy *= DAMPING;
      b.x += b.vx;
      b.y += b.vy;

      dx = b.x - cx;
      dy = b.y - cy;
      dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > hardMax) {
        b.x = cx + (dx / dist) * hardMax;
        b.y = cy + (dy / dist) * hardMax;
        b.vx *= 0.5;
        b.vy *= 0.5;
      }
    }
  }

  private draw() {
    this.drawShape();
    this.drawColor();
  }

  private drawShape() {
    const ctx = this.shapeCtx;
    const fieldCtx = this.fieldCtx;
    const fieldCanvas = this.fieldCanvas;
    const image = this.fieldImage;
    if (!ctx || !fieldCtx || !fieldCanvas || !image) return;

    const { metaballs, fieldSize } = this;
    const scale = fieldSize / this._logicalSize;
    const count = metaballs.length;
    const xs = this.ballFieldX;
    const ys = this.ballFieldY;
    const r2s = this.ballFieldR2;
    const invR2s = this.ballFieldInvR2;

    for (let i = 0; i < count; i++) {
      const b = metaballs[i]!;
      xs[i] = b.x * scale;
      ys[i] = b.y * scale;
      const influence = b.radius * scale * GOO_INFLUENCE;
      r2s[i] = influence * influence;
      invR2s[i] = 1 / r2s[i]!;
    }

    const [red, green, blue] = hslToRgb(
      this.curHue,
      SHAPE_SATURATION,
      SHAPE_LIGHTNESS,
    );
    const invRange = 1 / (GOO_THRESHOLD_HIGH - GOO_THRESHOLD_LOW);
    const data = image.data;
    let p = 0;

    for (let y = 0; y < fieldSize; y++) {
      const py = y + 0.5;
      for (let x = 0; x < fieldSize; x++) {
        const px = x + 0.5;
        let field = 0;
        for (let i = 0; i < count; i++) {
          const dx = px - xs[i]!;
          const dy = py - ys[i]!;
          const d2 = dx * dx + dy * dy;
          if (d2 < r2s[i]!) {
            const q = 1 - d2 * invR2s[i]!;
            field += q * q;
          }
        }
        let a = (field - GOO_THRESHOLD_LOW) * invRange;
        a = a <= 0 ? 0 : a >= 1 ? 1 : a * a * (3 - 2 * a);
        data[p] = red;
        data[p + 1] = green;
        data[p + 2] = blue;
        data[p + 3] = (a * 255) | 0;
        p += 4;
      }
    }

    fieldCtx.putImageData(image, 0, 0);
    ctx.clearRect(0, 0, this._logicalSize, this._logicalSize);
    ctx.drawImage(fieldCanvas, 0, 0, this._logicalSize, this._logicalSize);
  }

  private drawColor() {
    const ctx = this.colorCtx;
    if (!ctx) return;
    const size = this._logicalSize;
    const { cx, cy, baseRadius, metaballs, time } = this;

    ctx.clearRect(0, 0, size, size);

    const baseHue = this.curHue + Math.sin(time * 0.15) * 8;

    for (const b of metaballs) {
      const h =
        baseHue +
        ((b.hueOffset % 25) - 12) +
        Math.sin(time * 0.3 + b.noisePhase) * 6;
      const grad = ctx.createRadialGradient(
        b.x - b.radius * 0.15,
        b.y - b.radius * 0.15,
        0,
        b.x,
        b.y,
        b.radius * 1.1,
      );
      grad.addColorStop(0, `hsla(${h}, 65%, 55%, 0.85)`);
      grad.addColorStop(0.6, `hsla(${h + 8}, 55%, 48%, 0.4)`);
      grad.addColorStop(1, `hsla(${h + 15}, 45%, 42%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius * 1.1, 0, TWO_PI);
      ctx.fill();
    }

    const meshHues = [
      baseHue,
      baseHue + 20 + Math.sin(time * 0.2) * 10,
      baseHue - 12 + Math.cos(time * 0.18) * 8,
    ];
    const maxExtent = size * 0.47;

    for (let i = 0; i < meshHues.length; i++) {
      const source = metaballs[i + 1];
      if (!source) break;
      const hue = meshHues[i]!;
      const radius = baseRadius * (0.78 - i * 0.06);
      const alpha = 0.7 - i * 0.1;
      let px = cx + (source.x - cx) * 0.6;
      let py = cy + (source.y - cy) * 0.6;
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = Math.max(0, maxExtent - radius);
      if (dist > maxDist && dist > 0) {
        px = cx + (dx / dist) * maxDist;
        py = cy + (dy / dist) * maxDist;
      }
      const grad = ctx.createRadialGradient(px, py, 0, px, py, radius);
      grad.addColorStop(0, `hsla(${hue}, 75%, 58%, ${alpha})`);
      grad.addColorStop(1, `hsla(${hue}, 75%, 58%, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, TWO_PI);
      ctx.fill();
    }
  }
}
