"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AnalysisView({ markdown }: { markdown: string }) {
  return (
    <article className="analysis card px-4 py-5 sm:px-5">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
