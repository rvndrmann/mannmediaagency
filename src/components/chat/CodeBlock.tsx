
import { FC } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeBlockProps {
  value: string;
  language: string;
}

export const CodeBlock: FC<CodeBlockProps> = ({ value, language }) => {
  return (
    <div className="relative rounded-md my-2 bg-zinc-950 border border-zinc-800">
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-800">
        <span className="text-xs text-zinc-400">{language}</span>
      </div>
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{ margin: 0, borderRadius: '0 0 6px 6px' }}
        className="text-sm"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
};
