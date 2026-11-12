import { TextLayer, type PDFPageProxy, type RenderTask } from 'pdfjs-dist';
import 'pdfjs-dist/web/pdf_viewer.css';
import { useEffect, useRef, useState } from 'react';
import type { Annotation } from '../../types/domain';
import { normalizeSelectionRects } from './selectionGeometry';

interface SelectionInfo { text: string; rects: Array<{x:number;y:number;width:number;height:number}>; x: number; y: number }

export function PdfPage({ pdfPage, scale, highlights, onSelection }: { pdfPage: PDFPageProxy; scale: number; highlights: Annotation[]; onSelection: (selection?: SelectionInfo) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [hasText, setHasText] = useState<boolean>();
  const viewport = pdfPage.getViewport({ scale });

  useEffect(() => {
    const canvas = canvasRef.current; const textContainer = textRef.current;
    if (!canvas || !textContainer) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const outputViewport = pdfPage.getViewport({ scale: scale * ratio });
    canvas.width = Math.floor(outputViewport.width); canvas.height = Math.floor(outputViewport.height);
    canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
    const context = canvas.getContext('2d', { alpha: false });
    let renderTask: RenderTask | undefined; let textLayer: TextLayer | undefined; let cancelled = false;
    if (context) renderTask = pdfPage.render({ canvas, canvasContext: context, viewport: outputViewport });
    textContainer.replaceChildren();
    const textPromise = pdfPage.getTextContent().then(async (content) => {
      if (cancelled) return;
      setHasText(content.items.some((item) => 'str' in item && item.str.trim().length > 0));
      textLayer = new TextLayer({ textContentSource: content, container: textContainer, viewport });
      await textLayer.render();
    });
    void Promise.allSettled([renderTask?.promise ?? Promise.resolve(), textPromise]);
    return () => { cancelled = true; renderTask?.cancel(); textLayer?.cancel(); };
  }, [pdfPage, scale]);

  const captureSelection = () => {
    requestAnimationFrame(() => {
      const selection = window.getSelection(); const root = pageRef.current;
      if (!selection || selection.isCollapsed || !selection.rangeCount || !root || !root.contains(selection.anchorNode)) return onSelection();
      const text = selection.toString().trim(); if (!text) return onSelection();
      const bounds = root.getBoundingClientRect();
      const rects = normalizeSelectionRects(selection.getRangeAt(0).getClientRects(), bounds);
      const last = selection.getRangeAt(0).getBoundingClientRect();
      onSelection({ text, rects, x: Math.min(window.innerWidth - 170, Math.max(12, last.left + last.width / 2)), y: Math.max(12, last.top - 48) });
    });
  };
  useEffect(() => {
    let timer: number | undefined;
    const changed = () => { window.clearTimeout(timer); timer = window.setTimeout(captureSelection, 80); };
    document.addEventListener('selectionchange', changed);
    return () => { window.clearTimeout(timer); document.removeEventListener('selectionchange', changed); };
  });
  return <div ref={pageRef} className="pdf-page" style={{ width: viewport.width, height: viewport.height }} onMouseUp={captureSelection} onTouchEnd={captureSelection}>
    <canvas ref={canvasRef} aria-hidden="true" />
    <div ref={textRef} className="textLayer" aria-label={`Selectable text for page ${pdfPage.pageNumber}`} />
    <div className="highlight-layer" aria-hidden="true">{highlights.flatMap((annotation) => annotation.anchor.kind === 'pdf' ? annotation.anchor.rects.map((rect, index) => <i key={`${annotation.id}:${index}`} className={`saved-highlight ${annotation.color ?? 'yellow'}`} style={{ left: `${rect.x * 100}%`, top: `${rect.y * 100}%`, width: `${rect.width * 100}%`, height: `${rect.height * 100}%` }}/>) : [])}</div>
    {hasText === false && <p className="no-text-notice">This page contains no selectable text. It may be scanned; OCR is not enabled.</p>}
  </div>;
}
