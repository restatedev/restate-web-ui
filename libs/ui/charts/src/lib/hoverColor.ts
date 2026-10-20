export function hoverColor(color: string) {
  return `rgb(from ${color} calc(r * 1.1) calc(g * 1.1) calc(b * 1.1) / alpha)`;
}
