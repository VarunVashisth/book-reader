export interface NormalizedRect { x: number; y: number; width: number; height: number }

export function normalizeSelectionRects(rects: ArrayLike<Pick<DOMRect, 'left'|'top'|'width'|'height'>>, pageBounds: Pick<DOMRect, 'left'|'top'|'width'|'height'>): NormalizedRect[] {
  return Array.from(rects).filter((rect) => rect.width > 0 && rect.height > 0).map((rect) => ({
    x: (rect.left - pageBounds.left) / pageBounds.width,
    y: (rect.top - pageBounds.top) / pageBounds.height,
    width: rect.width / pageBounds.width,
    height: rect.height / pageBounds.height
  }));
}
