interface Position {
  x: number;
  y: number;
}

const ACCELERATION_UNIT = 0.3 / 225;

export class Point {
  azimuth: number;
  private _acceleration = 0;
  private _speed = 0;
  public radialEffect = 0;
  public elasticity = 0.001;
  public friction = 0.0085;

  get radius() {
    return this.parent?.radius ?? 0;
  }

  constructor(azimuth: number, public parent?: Shape) {
    this.azimuth = Math.PI - azimuth;
    this.acceleration =
      (-ACCELERATION_UNIT + Math.random() * ACCELERATION_UNIT * 2) *
      this.radius;
  }

  moveWithRespectToNeighbors(leftPoint: Point, rightPoint: Point) {
    if (!leftPoint || !rightPoint) {
      return;
    }
    this.acceleration =
      (-ACCELERATION_UNIT * this.radialEffect * this.radius +
        (leftPoint.radialEffect - this.radialEffect) +
        (rightPoint.radialEffect - this.radialEffect)) *
        this.elasticity -
      this.speed * this.friction;
  }

  set acceleration(value: number) {
    this._acceleration = value;
    this.speed += this._acceleration * 2;
  }

  get acceleration() {
    return this._acceleration;
  }

  set speed(value: number) {
    this._speed = value;
    this.radialEffect += this._speed * 5;
  }

  get speed() {
    return this._speed;
  }

  get position(): Position {
    if (!this.parent) {
      return { x: 0, y: 0 };
    }
    return {
      x:
        this.parent.center.x +
        this.components.x * (this.radius + this.radialEffect),
      y:
        this.parent.center.y +
        this.components.y * (this.radius + this.radialEffect),
    };
  }

  get components() {
    return {
      x: Math.cos(this.azimuth),
      y: Math.sin(this.azimuth),
    };
  }
}

export class Shape {
  get radius() {
    return this.parent.radius;
  }

  get center() {
    if (this._center) {
      return this._center;
    }
    const { x, y } = this.points
      .map(({ components }) => components)
      .reduce((r, { x, y }) => ({ x: r.x + x, y: r.y + y }), { x: 0, y: 0 });
    return {
      x: ((x / this.points.length + 1) * this.parent.canvasSize) / 2,
      y: ((y / this.points.length + 1) * this.parent.canvasSize) / 2,
    };
  }

  public readonly points: Point[];

  constructor(private parent: Blob, private _center?: Position) {
    this.points = Array(32)
      .fill(null)
      .map(
        (_, i, arr) => new Point(((Math.PI * 2) / arr.length) * (i + 1), this)
      );
  }

  path() {
    const path = new Path2D();
    if (this.points.length < 3) {
      return path;
    }

    const lastPoint = this.points.at(-1)!.position;
    let nextPoint = this.points.at(0)!.position;
    const firstPoint = nextPoint;
    const center = this.center;

    this.points
      .at(0)
      ?.moveWithRespectToNeighbors(this.points.at(-1)!, this.points.at(1)!);
    path.moveTo(center.x, center.y);
    path.moveTo(
      (lastPoint.x + nextPoint.x) / 2,
      (lastPoint.y + nextPoint.y) / 2
    );
    for (let index = 1; index < this.points.length; index++) {
      const point = this.points.at(index)!;
      point.moveWithRespectToNeighbors(
        this.points.at(index - 1)!,
        this.points.at(index + 1) ?? this.points.at(0)!
      );
      const centerX = (nextPoint.x + point.position.x) / 2;
      const centerY = (nextPoint.y + point.position.y) / 2;
      path.quadraticCurveTo(nextPoint.x, nextPoint.y, centerX, centerY);
      nextPoint = point.position;
    }

    const centerX = (nextPoint.x + firstPoint.x) / 2;
    const centerY = (nextPoint.y + firstPoint.y) / 2;
    path.quadraticCurveTo(nextPoint.x, nextPoint.y, centerX, centerY);
    path.closePath();

    return path;
  }

  isInside(ctx: CanvasRenderingContext2D, { x, y }: Position) {
    return ctx.isPointInPath(this.path(), x, y);
  }

  nearestPoint({ x, y }: Position) {
    const center = this.center;
    const vector = { x: x - center.x, y: y - center.y };
    const angle = Math.atan2(vector.y, vector.x);
    const firstPoint = this.points.at(0);

    if (!firstPoint) {
      return undefined;
    }

    const nearestPoint = this.points.reduce((result, point) => {
      if (Math.abs(angle - point.azimuth) < Math.abs(angle - result.azimuth)) {
        return point;
      }
      return result;
    }, firstPoint);

    return nearestPoint;
  }

  moveToward(position: Position, acceleration: number) {
    const nearestPoint = this.nearestPoint(position);
    if (nearestPoint) {
      nearestPoint.acceleration = acceleration;
    }
  }
}

type Status = 'idle' | 'active' | 'pause';

export class Blob {
  oldMousePosition?: Position;
  public shapes: Shape[] = [];
  public color = '#000000';
  private _status: Status = 'idle';
  private scale = 1;

  private canvas?: HTMLCanvasElement;
  private animationId?: number;
  private intervalId?: ReturnType<typeof setInterval>;
  private isExpanding = false;

  get status() {
    return this._status;
  }

  set status(value: Status) {
    this._status = value;
    this.updateAnimation();
    if (this.canvas) {
      this.canvas.dataset.status = value;
    }
  }

  cleanup() {
    this.status = 'pause';
    this.animationId && cancelAnimationFrame(this.animationId);
    this.shapes = [];
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.status = 'idle';

    this.push(new Shape(this, this.center));

    this.render();
    this.updateAnimation();
  }

  private updateAnimation() {
    const isPaused = this.status === 'pause';
    const isIdeal = this.status === 'idle';
    this.intervalId && clearInterval(this.intervalId);
    this.intervalId = setInterval(() => {
      this.shapes.forEach((shape) => {
        const LivelinessFactor = isPaused || isIdeal ? 0.5 : 0.8;

        shape.points
          .filter(() => {
            if (isPaused) {
              return Math.random() < 0.1;
            }
            if (isIdeal) {
              return Math.random() < 0.5;
            }
            return Math.random() < 1;
          })
          .forEach((point) => {
            point.acceleration =
              (-ACCELERATION_UNIT + Math.random() * 2 * ACCELERATION_UNIT) *
              this.radius *
              LivelinessFactor;
          });
      });
    }, 100);
  }

  private renderShape(shape: Shape) {
    const ctx = this.ctx;

    if (ctx) {
      const path = shape.path();
      const center = this.center;

      const primaryGradient = ctx.createRadialGradient(
        center.x,
        center.y,
        this.minRadius / 3,
        center.x,
        center.y,
        this.maxRadius * 1.15
      );
      const lightGradient = ctx.createRadialGradient(
        center.x + this.radius / 2,
        center.y - this.radius / 2,
        0,
        center.x + this.radius / 2,
        center.y - this.radius / 2,
        this.radius
      );
      const darkGradient = ctx.createRadialGradient(
        center.x + (this.radius * 0) / 2,
        center.y - (this.radius * 0) / 2,
        this.radius / 3,
        center.x + (this.radius * 0) / 2,
        center.y - (this.radius * 0) / 2,
        this.maxRadius * 1
      );

      primaryGradient.addColorStop(0, 'rgba(69, 82, 204, 1)'); // dark blue with 50% opacity
      primaryGradient.addColorStop(1, 'rgba(69, 82, 204, 0)'); // Transparent

      lightGradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); // dark blue with 50% opacity
      lightGradient.addColorStop(1, 'rgba(255, 255, 255, 0)'); // Transparent

      darkGradient.addColorStop(0, 'rgba(34,36,82, 0.1)'); // dark blue with 50% opacity
      darkGradient.addColorStop(0.6, 'rgba(34,36,82, 0.7)'); // dark blue with 50% opacity
      darkGradient.addColorStop(0.7, 'rgba(34,36,82, 0)'); // dark blue with 50% opacity
      darkGradient.addColorStop(1, 'rgba(34,36,82, 0)'); // Transparent

      ctx.fillStyle = darkGradient;
      ctx.fill(path);
      ctx.fillStyle = primaryGradient;
      ctx.fill(path);
      ctx.fillStyle = lightGradient;
      ctx.fill(path);

      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private render() {
    this.ctx?.clearRect(0, 0, this.canvasSize, this.canvasSize);

    for (const shape of this.shapes) {
      this.renderShape(shape);
    }
    this.animationId = requestAnimationFrame(() => {
      if (this.radius > this.maxRadius) {
        this.isExpanding = false;
      }
      if (this.radius <= this.minRadius) {
        this.isExpanding = true;
      }

      if (this.status === 'active' || Math.abs(this.scale - 1) > 0.01) {
        this.scale = this.isExpanding
          ? this.scale + this.expandingDelta
          : this.scale - this.expandingDelta;
      } else {
        this.scale = 1;
      }
      this.render();
    });
  }

  private push(shape: Shape) {
    this.shapes.push(shape);
  }

  private movementAcceleration({ x, y }: Position) {
    const center = this.center;

    const oldPosition = this.oldMousePosition ?? center;
    const newVector = { x: x - center.x, y: y - center.y };
    const oldVector = {
      x: oldPosition.x - center.x,
      y: oldPosition.y - center.y,
    };
    const newVectorLength = Math.sqrt(
      newVector.x * newVector.x + newVector.y * newVector.y
    );
    const oldVectorLength = Math.sqrt(
      oldVector.x * oldVector.x + oldVector.y * oldVector.y
    );
    const sign = newVectorLength > oldVectorLength ? 1 : -1;

    const strength = {
      x: oldPosition.x - x,
      y: oldPosition.y - y,
    };

    const factor = this.status === 'active' ? 3 : 2.5;

    return (
      Math.min(
        Math.sqrt(
          Math.min(
            Math.sqrt(strength.x * strength.x + strength.y * strength.y) * 2,
            4 * this.radius * this.radius
          ) /
            (2 * this.radius)
        ) / this.radius,
        ACCELERATION_UNIT / factor
      ) *
      sign *
      this.radius
    );
  }

  private get expandingDelta() {
    return 1.5 / (this.canvasSize ?? 1);
  }

  private get ctx() {
    return this.canvas?.getContext('2d') ?? null;
  }

  public get canvasSize() {
    return this.canvas?.clientWidth ?? 0;
  }

  get size() {
    return this.canvasSize * this.scale;
  }

  get radius() {
    return this.size * 0.3;
  }

  get maxRadius() {
    return this.canvasSize * 0.4;
  }
  get minRadius() {
    return this.canvasSize * 0.25;
  }

  get center(): Position {
    return {
      x: this.canvasSize / 2,
      y: this.canvasSize / 2,
    };
  }

  private convertViewPositionToCanvasPosition(
    canvas: HTMLElement,
    x: number,
    y: number
  ) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = x - rect.left;
    const mouseY = y - rect.top;

    return { x: mouseX, y: mouseY };
  }

  click(event: MouseEvent): void;
  click(event: Position): void;
  click(arg: Position | MouseEvent) {
    let mousePosition: Position;
    if ('currentTarget' in arg && arg.currentTarget instanceof HTMLElement) {
      mousePosition = this.convertViewPositionToCanvasPosition(
        arg.currentTarget,
        arg.clientX,
        arg.clientY
      );
    } else {
      mousePosition = arg;
    }
    if (this.status === 'pause') {
      return;
    }

    const canvas = this.canvas;
    if (canvas) {
      const factor = this.status === 'active' ? 8 : 3;
      this.shapes
        .filter((shape) => shape.isInside(this.ctx!, mousePosition))
        .forEach((shape) => {
          shape.moveToward(
            mousePosition,
            factor * ACCELERATION_UNIT * this.radius
          );
        });
    }
  }

  mouseMove(event: MouseEvent): void;
  mouseMove(event: Position): void;
  mouseMove(arg: Position | MouseEvent) {
    let mousePosition: Position;
    if ('currentTarget' in arg && arg.currentTarget instanceof HTMLElement) {
      mousePosition = this.convertViewPositionToCanvasPosition(
        arg.currentTarget,
        arg.clientX,
        arg.clientY
      );
    } else {
      mousePosition = arg;
    }

    if (this.status === 'pause') {
      return;
    }

    const canvas = this.canvas;
    if (canvas) {
      this.shapes
        .filter((shape) => shape.isInside(this.ctx!, mousePosition))
        .forEach((shape) => {
          shape.moveToward(
            mousePosition,
            this.movementAcceleration(mousePosition)
          );
        });

      this.oldMousePosition = mousePosition;
    }
  }
}
