import React from "react";

interface LinkifiedTextProps {
  text: string;
  className?: string;
}

export function LinkifiedText({ text, className = "" }: LinkifiedTextProps) {
  if (!text) return null;

  // General URL capture regex that matches http:// or https:// addresses
  const urlRegex = /(https?:\/\/[^\s<>""'']+)/gi;
  const parts = text.split(urlRegex);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (part.match(urlRegex)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              referrerPolicy="no-referrer"
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-850 dark:hover:text-indigo-300 underline cursor-pointer break-all inline"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        return part;
      })}
    </span>
  );
}
