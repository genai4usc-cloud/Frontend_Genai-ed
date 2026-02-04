'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Markdown({ value }: { value: string }) {
  return (
    <div className="markdown-content text-sm text-gray-700 leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {value || ''}
      </ReactMarkdown>
    </div>
  );
}
