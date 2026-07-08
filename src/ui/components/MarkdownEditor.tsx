import { type ChangeEvent, type ReactNode, type UIEvent, useMemo, useRef } from "react";
import { Bold, Code2, Heading1, Italic, Link, List, Quote } from "lucide-react";

interface MarkdownEditorProps {
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}

interface SelectionUpdate {
  end: number;
  start: number;
  value: string;
}

type MarkdownCommand = "bold" | "italic" | "code" | "heading" | "quote" | "list" | "link";

const toolbarItems: Array<{ command: MarkdownCommand; icon: ReactNode; label: string }> = [
  { command: "heading", icon: <Heading1 aria-hidden="true" size={16} />, label: "Heading" },
  { command: "bold", icon: <Bold aria-hidden="true" size={16} />, label: "Bold" },
  { command: "italic", icon: <Italic aria-hidden="true" size={16} />, label: "Italic" },
  { command: "code", icon: <Code2 aria-hidden="true" size={16} />, label: "Code" },
  { command: "quote", icon: <Quote aria-hidden="true" size={16} />, label: "Quote" },
  { command: "list", icon: <List aria-hidden="true" size={16} />, label: "List" },
  { command: "link", icon: <Link aria-hidden="true" size={16} />, label: "Link" }
];

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const pattern = /(`[^`\n]+`|\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[[^\]\n]+\]\([^)]+\))/g;
  const parts: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }

    const token = match[0];
    const className = token.startsWith("`")
      ? "markdown-token-code"
      : token.startsWith("[")
        ? "markdown-token-link"
        : token.startsWith("**") || token.startsWith("__")
          ? "markdown-token-strong"
          : "markdown-token-emphasis";

    parts.push(
      <span className={className} key={`${keyPrefix}-${match.index}`}>
        {token}
      </span>
    );
    cursor = match.index + token.length;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.length > 0 ? parts : [text];
}

function renderMarkdownLine(line: string, index: number): ReactNode {
  const headingMatch = /^(#{1,6})(\s+.*)?$/.exec(line);

  if (headingMatch) {
    return (
      <span className="markdown-line-heading">
        <span className="markdown-token-marker">{headingMatch[1]}</span>
        {renderInlineMarkdown(headingMatch[2] ?? "", `heading-${index}`)}
      </span>
    );
  }

  const quoteMatch = /^(>\s?)(.*)$/.exec(line);

  if (quoteMatch) {
    return (
      <span className="markdown-line-quote">
        <span className="markdown-token-marker">{quoteMatch[1]}</span>
        {renderInlineMarkdown(quoteMatch[2], `quote-${index}`)}
      </span>
    );
  }

  const listMatch = /^(\s*)([-*+]|\d+\.)(\s+)(.*)$/.exec(line);

  if (listMatch) {
    return (
      <span className="markdown-line-list">
        {listMatch[1]}
        <span className="markdown-token-marker">{listMatch[2]}</span>
        {listMatch[3]}
        {renderInlineMarkdown(listMatch[4], `list-${index}`)}
      </span>
    );
  }

  return renderInlineMarkdown(line, `plain-${index}`);
}

function renderHighlightedMarkdown(value: string): ReactNode[] {
  const lines = value.split("\n");

  return lines.flatMap((line, index) => {
    const nodes: ReactNode[] = [<span key={`line-${index}`}>{renderMarkdownLine(line, index)}</span>];

    if (index < lines.length - 1) {
      nodes.push("\n");
    }

    return nodes;
  });
}

function wrapSelection(value: string, start: number, end: number, before: string, after: string, fallback: string): SelectionUpdate {
  const selected = value.slice(start, end) || fallback;
  const nextValue = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
  const nextStart = start + before.length;

  return {
    end: nextStart + selected.length,
    start: nextStart,
    value: nextValue
  };
}

function prefixSelectedLines(value: string, start: number, end: number, prefix: string): SelectionUpdate {
  const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", end);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;
  const block = value.slice(lineStart, lineEnd);
  const prefixed = block
    .split("\n")
    .map((line) => (line.startsWith(prefix) ? line : `${prefix}${line}`))
    .join("\n");

  return {
    end: lineStart + prefixed.length,
    start: start + prefix.length,
    value: `${value.slice(0, lineStart)}${prefixed}${value.slice(lineEnd)}`
  };
}

function applyMarkdownCommand(value: string, start: number, end: number, command: MarkdownCommand): SelectionUpdate {
  switch (command) {
    case "bold":
      return wrapSelection(value, start, end, "**", "**", "bold text");
    case "italic":
      return wrapSelection(value, start, end, "_", "_", "italic text");
    case "code":
      return value.slice(start, end).includes("\n")
        ? wrapSelection(value, start, end, "```\n", "\n```", "code")
        : wrapSelection(value, start, end, "`", "`", "code");
    case "heading":
      return prefixSelectedLines(value, start, end, "# ");
    case "quote":
      return prefixSelectedLines(value, start, end, "> ");
    case "list":
      return prefixSelectedLines(value, start, end, "- ");
    case "link":
      return wrapSelection(value, start, end, "[", "](url)", "link text");
  }
}

export function MarkdownEditor({ label, onChange, placeholder, value }: MarkdownEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const highlightedMarkdown = useMemo(() => renderHighlightedMarkdown(value), [value]);

  function handleScroll(event: UIEvent<HTMLTextAreaElement>): void {
    if (!highlightRef.current) {
      return;
    }

    highlightRef.current.scrollTop = event.currentTarget.scrollTop;
    highlightRef.current.scrollLeft = event.currentTarget.scrollLeft;
  }

  function handleChange(event: ChangeEvent<HTMLTextAreaElement>): void {
    onChange(event.target.value);
  }

  function applyCommand(command: MarkdownCommand): void {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const update = applyMarkdownCommand(value, textarea.selectionStart, textarea.selectionEnd, command);
    onChange(update.value);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(update.start, update.end);
    });
  }

  return (
    <div className="markdown-editor">
      <div className="markdown-editor-header">
        <span>{label}</span>
        <div className="markdown-toolbar" aria-label="Markdown tools">
          {toolbarItems.map((item) => (
            <button
              aria-label={item.label}
              className="markdown-tool-button"
              key={item.command}
              onClick={() => applyCommand(item.command)}
              title={item.label}
              type="button"
            >
              {item.icon}
            </button>
          ))}
        </div>
      </div>
      <div className="markdown-editor-frame">
        <pre aria-hidden="true" className="markdown-highlight" ref={highlightRef}>
          {highlightedMarkdown}
        </pre>
        <textarea
          aria-label={label}
          className="markdown-input"
          onChange={handleChange}
          onScroll={handleScroll}
          placeholder={placeholder}
          ref={textareaRef}
          value={value}
        />
      </div>
    </div>
  );
}
