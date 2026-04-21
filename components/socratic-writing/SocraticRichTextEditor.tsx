'use client';

import { useEffect, useRef } from 'react';
import { Bold, Heading1, Heading2, Heading3, Italic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocraticRichTextEditorProps {
  value: string;
  readOnly?: boolean;
  onChange: (nextHtml: string) => void;
}

export default function SocraticRichTextEditor({
  value,
  readOnly = false,
  onChange,
}: SocraticRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;
    if (editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const applyCommand = (command: string, commandValue?: string) => {
    if (readOnly) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    onChange(editorRef.current?.innerHTML || '');
  };

  return (
    <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 px-3 py-2 bg-gray-50">
        <button
          type="button"
          onClick={() => applyCommand('bold')}
          className="rounded-lg px-3 py-2 hover:bg-white text-gray-700"
          disabled={readOnly}
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyCommand('italic')}
          className="rounded-lg px-3 py-2 hover:bg-white text-gray-700"
          disabled={readOnly}
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyCommand('formatBlock', '<h1>')}
          className="rounded-lg px-3 py-2 hover:bg-white text-gray-700"
          disabled={readOnly}
        >
          <Heading1 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyCommand('formatBlock', '<h2>')}
          className="rounded-lg px-3 py-2 hover:bg-white text-gray-700"
          disabled={readOnly}
        >
          <Heading2 className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => applyCommand('formatBlock', '<h3>')}
          className="rounded-lg px-3 py-2 hover:bg-white text-gray-700"
          disabled={readOnly}
        >
          <Heading3 className="w-4 h-4" />
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        onInput={() => onChange(editorRef.current?.innerHTML || '')}
        className={cn(
          'min-h-[340px] px-6 py-5 outline-none prose prose-sm max-w-none',
          readOnly && 'bg-gray-50 text-gray-700',
        )}
      />
    </div>
  );
}
