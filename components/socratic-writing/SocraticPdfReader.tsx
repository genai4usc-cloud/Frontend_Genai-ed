'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

type SocraticPdfReaderProps = {
  url: string;
  title: string;
  onOpened?: () => void;
  onReachedEnd?: () => void;
};

type RenderedPage = {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
};

const END_THRESHOLD_PX = 32;

export default function SocraticPdfReader({
  url,
  title,
  onOpened,
  onReachedEnd,
}: SocraticPdfReaderProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pages, setPages] = useState<RenderedPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reachedEnd, setReachedEnd] = useState(false);
  const reachedEndRef = useRef(false);

  const totalHeight = useMemo(
    () => pages.reduce((sum, page) => sum + page.height, 0),
    [pages],
  );

  useEffect(() => {
    let active = true;

    const renderPdf = async () => {
      setLoading(true);
      setError(null);
      setPages([]);
      reachedEndRef.current = false;
      setReachedEnd(false);

      try {
        const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF (${response.status}).`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdfData = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjs.getDocument({ data: pdfData });
        const pdfDocument = await loadingTask.promise;
        const nextPages: RenderedPage[] = [];

        for (let index = 1; index <= pdfDocument.numPages; index += 1) {
          const page = await pdfDocument.getPage(index);
          const viewport = page.getViewport({ scale: 1.25 });
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Could not create PDF canvas context.');
          }

          canvas.width = viewport.width;
          canvas.height = viewport.height;

          await page.render({
            canvasContext: context,
            viewport,
          }).promise;

          nextPages.push({
            pageNumber: index,
            dataUrl: canvas.toDataURL('image/png'),
            width: viewport.width,
            height: viewport.height,
          });
        }

        if (!active) return;
        setPages(nextPages);
        onOpened?.();
      } catch (nextError) {
        if (!active) return;
        console.error('SocraticPdfReader failed to render PDF', {
          url,
          error: nextError,
        });
        setError(nextError instanceof Error ? nextError.message : 'Failed to load PDF.');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void renderPdf();

    return () => {
      active = false;
    };
  }, [onOpened, url]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (reachedEndRef.current) return;
      const atEnd =
        container.scrollTop + container.clientHeight >= container.scrollHeight - END_THRESHOLD_PX;
      if (!atEnd) return;

      reachedEndRef.current = true;
      setReachedEnd(true);
      onReachedEnd?.();
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [onReachedEnd, totalHeight]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 flex flex-col items-center justify-center gap-3 text-gray-600 min-h-[420px]">
        <Loader2 className="w-6 h-6 animate-spin" />
        <p className="text-sm">Loading {title}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 min-h-[220px]">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="border-b border-gray-200 px-4 py-3 bg-gray-50">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="text-xs text-gray-600 mt-1">
          Scroll to the end of the PDF to unlock completion.
        </p>
      </div>
      <div ref={scrollRef} className="max-h-[680px] overflow-y-auto bg-gray-100">
        <div className="space-y-5 p-5">
          {pages.map((page) => (
            <div key={page.pageNumber} className="rounded-xl bg-white shadow-sm overflow-hidden">
              <img
                src={page.dataUrl}
                alt={`${title} page ${page.pageNumber}`}
                width={page.width}
                height={page.height}
                className="w-full h-auto"
              />
            </div>
          ))}
          <div className="rounded-xl border border-dashed border-gray-300 bg-white px-4 py-5 text-center text-sm text-gray-600">
            {reachedEnd ? 'You reached the end of the PDF.' : 'Keep scrolling to reach the end of the PDF.'}
          </div>
        </div>
      </div>
    </div>
  );
}
