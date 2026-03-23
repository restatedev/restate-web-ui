import { noise2D } from './noise';

const TWO_PI = Math.PI * 2;

export type FerrofluidStatus = 'idle' | 'active' | 'pause';

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
};

const SPRING = 0.012;
const DAMPING = 0.965;
const LERP = 0.02;
const SHAPE_FILL = 'rgba(155, 145, 175, 1)';

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
    this.dpr = window.devicePixelRatio || 1;
    this._logicalSize = shapeCanvas.clientWidth;

    for (const c of [shapeCanvas, colorCanvas]) {
      c.width = this._logicalSize * this.dpr;
      c.height = this._logicalSize * this.dpr;
    }

    this.shapeCtx = shapeCanvas.getContext('2d');
    this.colorCtx = colorCanvas.getContext('2d');
    if (this.shapeCtx) this.shapeCtx.scale(this.dpr, this.dpr);
    if (this.colorCtx) this.colorCtx.scale(this.dpr, this.dpr);

    this.cx = this._logicalSize / 2;
    this.cy = this._logicalSize / 2;
    this.baseRadius = this._logicalSize * 0.42;

    this.createMetaballs();
    this.isInitialized = true;
    this.animationId = requestAnimationFrame((ts) => this.loop(ts));
  }

  cleanup() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.isInitialized = false;
    this.metaballs = [];
    this.shapeCanvas = null;
    this.colorCanvas = null;
    this.shapeCtx = null;
    this.colorCtx = null;
    this.mousePos = null;
    this.mouseVelocity = 0;
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
        cx + Math.cos(a) * r * 0.1, cy + Math.sin(a) * r * 0.1,
        r * 0.34, a, r * 0.22, 0.3 + i * 0.15, 30 + i * 25,
      );
    }

    for (let i = 0; i < 5; i++) {
      const a = (TWO_PI / 5) * i + Math.random() * 0.3;
      this.addBall(
        cx + Math.cos(a) * r * 0.15, cy + Math.sin(a) * r * 0.15,
        r * 0.16, a, r * 0.4, 0.45 + i * 0.1, 15 + i * 18,
      );
    }

    for (let i = 0; i < 4; i++) {
      const a = (TWO_PI / 4) * i + Math.random();
      this.addBall(
        cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2,
        r * 0.1, a, r * 0.5, 0.6 + i * 0.12, 40 + i * 20,
      );
    }
  }

  private addBall(
    x: number, y: number, radius: number,
    baseAngle: number, orbitRadius: number, orbitSpeed: number, hueOffset: number,
  ) {
    this.metaballs.push({
      x, y, vx: 0, vy: 0, radius, baseAngle,
      orbitRadius, orbitSpeed, noisePhase: Math.random() * 100, hueOffset,
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
  }

  private updatePhysics() {
    const { cx, cy, baseRadius, time, curSpread, curSpeed, curNoiseAmp, curNoiseSpeed } = this;
    const softMax = this._logicalSize * 0.38;
    const hardMax = this._logicalSize * 0.45;

    for (const b of this.metaballs) {
      b.baseAngle += b.orbitSpeed * curSpeed * 0.016;

      const n1x = noise2D(b.noisePhase, time * curNoiseSpeed * 0.3);
      const n1y = noise2D(b.noisePhase + 50, time * curNoiseSpeed * 0.3);
      const n2x = noise2D(b.noisePhase + 100, time * curNoiseSpeed * 0.5);
      const n2y = noise2D(b.noisePhase + 150, time * curNoiseSpeed * 0.5);

      const tx = cx + Math.cos(b.baseAngle) * b.orbitRadius * curSpread
        + n1x * curNoiseAmp + n2x * curNoiseAmp * 0.3;
      const ty = cy + Math.sin(b.baseAngle) * b.orbitRadius * curSpread
        + n1y * curNoiseAmp + n2y * curNoiseAmp * 0.3;

      b.vx += (tx - b.x) * SPRING;
      b.vy += (ty - b.y) * SPRING;

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
    const sCtx = this.shapeCtx!;
    const cCtx = this.colorCtx!;
    const size = this._logicalSize;
    const { cx, cy, baseRadius, metaballs, time } = this;

    sCtx.clearRect(0, 0, size, size);
    cCtx.clearRect(0, 0, size, size);

    sCtx.fillStyle = SHAPE_FILL;
    for (const b of metaballs) {
      sCtx.beginPath();
      sCtx.arc(b.x, b.y, b.radius, 0, TWO_PI);
      sCtx.fill();
    }

    const baseHue = 250 + Math.sin(time * 0.15) * 12;
    for (const b of metaballs) {
      const h = baseHue + b.hueOffset + Math.sin(time * 0.3 + b.noisePhase) * 10;
      const grad = cCtx.createRadialGradient(
        b.x - b.radius * 0.15, b.y - b.radius * 0.15, 0,
        b.x, b.y, b.radius * 1.1,
      );
      grad.addColorStop(0, `hsla(${h}, 65%, 55%, 0.85)`);
      grad.addColorStop(0.6, `hsla(${h + 15}, 55%, 48%, 0.4)`);
      grad.addColorStop(1, `hsla(${h + 30}, 45%, 42%, 0)`);
      cCtx.fillStyle = grad;
      cCtx.beginPath();
      cCtx.arc(b.x, b.y, b.radius * 1.1, 0, TWO_PI);
      cCtx.fill();
    }

    const meshHues = [
      baseHue,
      baseHue + 45 + Math.sin(time * 0.2) * 15,
      baseHue - 30 + Math.cos(time * 0.18) * 12,
    ];
    const meshPoints = [
      { x: cx + Math.cos(time * 0.1) * baseRadius * 0.45, y: cy + Math.sin(time * 0.13) * baseRadius * 0.4, r: baseRadius * 0.9, a: 0.7 },
      { x: cx + Math.cos(time * 0.08 + 2.2) * baseRadius * 0.5, y: cy + Math.sin(time * 0.11 + 2.2) * baseRadius * 0.45, r: baseRadius * 0.85, a: 0.6 },
      { x: cx + Math.cos(time * 0.07 + 4.0) * baseRadius * 0.4, y: cy + Math.sin(time * 0.09 + 4.0) * baseRadius * 0.5, r: baseRadius * 0.8, a: 0.5 },
    ];
    for (let i = 0; i < meshPoints.length; i++) {
      const p = meshPoints[i]!;
      const h = meshHues[i]!;
      const grad = cCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `hsla(${h}, 75%, 58%, ${p.a})`);
      grad.addColorStop(1, `hsla(${h}, 75%, 58%, 0)`);
      cCtx.fillStyle = grad;
      cCtx.fillRect(0, 0, size, size);
    }

    const shineAngle = time * 0.2;
    const sx = this.mousePos ? cx + (this.mousePos.x - cx) * 0.2 : cx + Math.cos(shineAngle) * baseRadius * 0.15;
    const sy = this.mousePos ? cy + (this.mousePos.y - cy) * 0.2 : cy + Math.sin(shineAngle) * baseRadius * 0.15;
    const specGrad = cCtx.createRadialGradient(sx, sy, 0, sx, sy, baseRadius * 0.5);
    specGrad.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
    specGrad.addColorStop(0.25, 'rgba(255, 255, 255, 0.08)');
    specGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    cCtx.fillStyle = specGrad;
    cCtx.fillRect(0, 0, size, size);
  }
}
