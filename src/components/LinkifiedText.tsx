import React, { useState } from "react";
import { Folder, Check, Copy } from "lucide-react";

interface LinkifiedTextProps {
  text: string;
  className?: string;
  noBg?: boolean;
}

interface Token {
  text: string;
  type: "text" | "url" | "unc";
}

export function LinkifiedText({ text, className = "", noBg = false }: LinkifiedTextProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!text) return null;

  // Regular expression for standard HTTP/HTTPS URL
  const urlRegex = /(https?:\/\/[^\s<>""'']+)/gi;

  // Precise Windows UNC (Network) path regex supporting spaces inside segments and standard characters,
  // excluding trailing spaces or non-path punctuation from capture at the end of sentence.
  const uncRegex = /\\\\([^\\/:*?"<>|\s\r\n]+(?:\s+[^\\/:*?"<>|\s\r\n]+)*)(?:\\[^\\/:*?"<>|\s\r\n]+(?:\s+[^\\/:*?"<>|\s\r\n]+)*)+/gi;

  // Combine regex matches to parse text sequentially
  const tokens: Token[] = [];
  let lastIndex = 0;
  
  // Find all matches for both URLs and UNC paths
  const matches: { index: number; length: number; text: string; type: "url" | "unc" }[] = [];

  // 1. Gather URL matches
  let match;
  urlRegex.lastIndex = 0;
  while ((match = urlRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      text: match[0],
      type: "url"
    });
  }

  // 2. Gather UNC matches
  uncRegex.lastIndex = 0;
  while ((match = uncRegex.exec(text)) !== null) {
    // Ensure we don't overlap with already matched URLs
    const isOverlapping = matches.some(
      m => (match!.index >= m.index && match!.index < m.index + m.length) ||
           (match!.index + match![0].length > m.index && match!.index + match![0].length <= m.index + m.length)
    );
    if (!isOverlapping) {
      matches.push({
        index: match.index,
        length: match[0].length,
        text: match[0],
        type: "unc"
      });
    }
  }

  // Sort matches by index to parse linearly
  matches.sort((a, b) => a.index - b.index);

  // 3. Tokenize
  for (const m of matches) {
    if (m.index > lastIndex) {
      tokens.push({
        text: text.substring(lastIndex, m.index),
        type: "text"
      });
    }
    tokens.push({
      text: m.text,
      type: m.type
    });
    lastIndex = m.index + m.length;
  }

  if (lastIndex < text.length) {
    tokens.push({
      text: text.substring(lastIndex),
      type: "text"
    });
  }

  const handleCopyUnc = (UNCPath: string, index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(UNCPath);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <span className={`${className} inline-wrap`}>
      {tokens.map((token, index) => {
        if (token.type === "url") {
          return (
            <a
              key={index}
              href={token.text}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline cursor-pointer break-all inline"
              onClick={(e) => e.stopPropagation()}
            >
              {token.text}
            </a>
          );
        }
        
        if (token.type === "unc") {
          const isCopied = copiedIndex === index;
          return (
            <button
              key={index}
              type="button"
              onClick={(e) => handleCopyUnc(token.text, index, e)}
              className={noBg 
                ? "inline-flex items-center gap-1 text-[11px] font-mono transition-colors cursor-pointer break-all text-left text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                : "inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 border border-amber-200/40 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-[11px] font-mono transition-all cursor-pointer break-all text-left"
              }
              title="Click to copy Netzwerk/UNC path to clipboard"
            >
              <Folder className={`w-3.5 h-3.5 shrink-0 ${noBg ? "text-blue-500" : "text-amber-500"}`} />
              <span className={noBg ? "underline decoration-dotted decoration-blue-400" : "underline decoration-dotted decoration-amber-400"}>{token.text}</span>
              {isCopied ? (
                <span className="ml-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5 shrink-0 bg-emerald-50 dark:bg-emerald-950/50 px-1 rounded border border-emerald-200/30">
                  <Check className="w-2.5 h-2.5" /> Copied!
                </span>
              ) : (
                <Copy className={`ml-1 w-2.5 h-2.5 ${noBg ? "text-blue-400/60 hover:text-blue-600" : "text-amber-500/60 hover:text-amber-600"} shrink-0`} />
              )}
            </button>
          );
        }

        return <React.Fragment key={index}>{token.text}</React.Fragment>;
      })}
    </span>
  );
}
