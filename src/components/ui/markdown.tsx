
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ node, ...props }) => <h1 className="text-2xl font-bold my-4" {...props} />,
        h2: ({ node, ...props }) => <h2 className="text-xl font-bold my-3" {...props} />,
        h3: ({ node, ...props }) => <h3 className="text-lg font-bold my-2" {...props} />,
        p: ({ node, ...props }) => <p className="my-2" {...props} />,
        ul: ({ node, ...props }) => <ul className="list-disc pl-6 my-2" {...props} />,
        ol: ({ node, ...props }) => <ol className="list-decimal pl-6 my-2" {...props} />,
        li: ({ node, ...props }) => <li className="my-1" {...props} />,
        a: ({ node, ...props }) => (
          <a className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />
        ),
        code: ({ node, inline, className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          return !inline ? (
            <pre className="bg-gray-800 rounded p-2 my-2 overflow-x-auto">
              <code className={`${match && `language-${match[1]}`} text-sm`} {...props}>
                {children}
              </code>
            </pre>
          ) : (
            <code className="bg-gray-800 px-1 py-0.5 rounded text-sm" {...props}>
              {children}
            </code>
          );
        },
        blockquote: ({ node, ...props }) => (
          <blockquote className="border-l-4 border-gray-500 pl-4 my-2 italic" {...props} />
        ),
        img: ({ node, ...props }) => (
          <img className="max-w-full h-auto rounded-lg my-2" {...props} alt={props.alt || 'Image'} />
        ),
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full divide-y divide-gray-700" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => <thead className="bg-gray-800" {...props} />,
        tbody: ({ node, ...props }) => <tbody className="divide-y divide-gray-700" {...props} />,
        tr: ({ node, ...props }) => <tr className="hover:bg-gray-800/50" {...props} />,
        th: ({ node, ...props }) => (
          <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" {...props} />
        ),
        td: ({ node, ...props }) => <td className="px-3 py-2 text-sm" {...props} />,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
