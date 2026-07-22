import React, { useRef, useCallback, useEffect, useState } from 'react';

/* ── Toolbar icon SVGs ── */
const BoldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H7v14h7.04c2.09 0 3.71-1.7 3.71-3.79 0-1.52-.86-2.82-2.15-3.42zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>
);
const ItalicIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4v3h2.21l-3.42 8H6v3h8v-3h-2.21l3.42-8H18V4z"/></svg>
);
const StrikethroughIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 19h4v-3h-4v3zM5 4v3h5v3h4V7h5V4H5zM3 14h18v-2H3v2z"/></svg>
);
const CodeIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>
);
const H1Icon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M5 4v3h5.5v12h3V7H19V4H5z"/></svg>
);
const H2Icon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="2" y="17" fontSize="14" fontWeight="bold" fontFamily="sans-serif">H2</text></svg>
);
const H3Icon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" fontSize="14" fontWeight="bold" fontFamily="sans-serif">H3</text></svg>
);
const ULIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4 10.5c-.83 0-1.5.67-1.5 1.5s.67 1.5 1.5 1.5 1.5-.67 1.5-1.5-.67-1.5-1.5-1.5zm0-6c-.83 0-1.5.67-1.5 1.5S3.17 7.5 4 7.5 5.5 6.83 5.5 6 4.83 4.5 4 4.5zm0 12c-.83 0-1.5.68-1.5 1.5s.68 1.5 1.5 1.5 1.5-.68 1.5-1.5-.67-1.5-1.5-1.5zM7 19h14v-2H7v2zm0-6h14v-2H7v2zm0-8v2h14V5H7z"/></svg>
);
const OLIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2 17h2v.5H3v1h1v.5H2v1h3v-4H2v1zm1-9h1V4H2v1h1v3zm-1 3h1.8L2 13.1v.9h3v-1H3.2L5 10.9V10H2v1zm5-6v2h14V5H7zm0 14h14v-2H7v2zm0-6h14v-2H7v2z"/></svg>
);
const BlockquoteIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
);
const CodeBlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/><rect x="3" y="20" width="18" height="2" rx="1"/></svg>
);
const LinkIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
);
const HRIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="11" width="20" height="2" rx="1"/></svg>
);
const TableIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3v18h18V3H3zm8 16H5v-6h6v6zm0-8H5V5h6v6zm8 8h-6v-6h6v6zm0-8h-6V5h6v6z"/></svg>
);
const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>
);
const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.4 10.6C16.55 8.99 14.15 8 11.5 8c-4.65 0-8.58 3.03-9.96 7.22L3.9 16c1.05-3.19 4.05-5.5 7.6-5.5 1.95 0 3.73.72 5.12 1.88L13 16h9V7l-3.6 3.6z"/></svg>
);

/* ── Markdown ↔ HTML conversion helpers ── */

function markdownToHtml(md: string): string {
  if (!md) return '';
  let html = md;

  // Code blocks (``` ... ```) — must be before inline code
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) =>
    `<pre><code>${escapeHtml(code.trimEnd())}</code></pre>`
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr>');

  // Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Bold + italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Unordered lists
  html = html.replace(/(^- .+$(\n- .+$)*)/gm, (block) => {
    const items = block.split('\n').map(line => `<li>${line.replace(/^- /, '')}</li>`).join('');
    return `<ul>${items}</ul>`;
  });

  // Ordered lists
  html = html.replace(/(^\d+\. .+$(\n\d+\. .+$)*)/gm, (block) => {
    const items = block.split('\n').map(line => `<li>${line.replace(/^\d+\. /, '')}</li>`).join('');
    return `<ol>${items}</ol>`;
  });

  // Tables
  html = html.replace(/(^\|.+\|$\n^\|[-| :]+\|$(\n^\|.+\|$)*)/gm, (block) => {
    const rows = block.split('\n').filter(r => !r.match(/^\|[-| :]+\|$/));
    const headerCells = rows[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
    const bodyRows = rows.slice(1).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
      return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`;
  });

  // Paragraphs — wrap remaining text blocks
  html = html.replace(/\n\n/g, '</p><p>');
  if (!html.startsWith('<')) html = '<p>' + html;
  if (!html.endsWith('>')) html = html + '</p>';

  // Clean up empty paragraphs
  html = html.replace(/<p><(h[1-3]|ul|ol|pre|blockquote|hr|table)/g, '<$1');
  html = html.replace(/<\/(h[1-3]|ul|ol|pre|blockquote|table)><\/p>/g, '</$1>');
  html = html.replace(/<p><hr><\/p>/g, '<hr>');
  html = html.replace(/<p>\s*<\/p>/g, '');

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function htmlToMarkdown(html: string): string {
  if (!html) return '';

  const div = document.createElement('div');
  div.innerHTML = html;
  return nodeToMarkdown(div).trim();
}

function nodeToMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent || '';
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return '';

  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const childMd = Array.from(el.childNodes).map(nodeToMarkdown).join('');

  switch (tag) {
    case 'h1': return `# ${childMd}\n\n`;
    case 'h2': return `## ${childMd}\n\n`;
    case 'h3': return `### ${childMd}\n\n`;
    case 'p': return `${childMd}\n\n`;
    case 'br': return '\n';
    case 'strong':
    case 'b': return `**${childMd}**`;
    case 'em':
    case 'i': return `*${childMd}*`;
    case 'del':
    case 's': return `~~${childMd}~~`;
    case 'code':
      if (el.parentElement?.tagName.toLowerCase() === 'pre') return childMd;
      return `\`${childMd}\``;
    case 'pre': {
      const codeEl = el.querySelector('code');
      const codeText = codeEl ? codeEl.textContent || '' : el.textContent || '';
      return `\`\`\`\n${codeText}\n\`\`\`\n\n`;
    }
    case 'a': {
      const href = el.getAttribute('href') || '';
      return `[${childMd}](${href})`;
    }
    case 'ul': {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map(li => `- ${nodeToMarkdown(li).trim()}`).join('\n');
      return `${items}\n\n`;
    }
    case 'ol': {
      const items = Array.from(el.querySelectorAll(':scope > li'))
        .map((li, i) => `${i + 1}. ${nodeToMarkdown(li).trim()}`).join('\n');
      return `${items}\n\n`;
    }
    case 'li': return childMd;
    case 'blockquote': {
      const lines = childMd.trim().split('\n').map(l => `> ${l}`).join('\n');
      return `${lines}\n\n`;
    }
    case 'hr': return '---\n\n';
    case 'table': {
      const thead = el.querySelector('thead');
      const tbody = el.querySelector('tbody');
      if (!thead || !tbody) return childMd;
      const headers = Array.from(thead.querySelectorAll('th')).map(th => th.textContent?.trim() || '');
      const sep = headers.map(() => '---');
      const rows = Array.from(tbody.querySelectorAll('tr')).map(tr =>
        Array.from(tr.querySelectorAll('td')).map(td => td.textContent?.trim() || '')
      );
      let md = `| ${headers.join(' | ')} |\n| ${sep.join(' | ')} |\n`;
      rows.forEach(row => { md += `| ${row.join(' | ')} |\n`; });
      return md + '\n';
    }
    case 'thead':
    case 'tbody':
    case 'tr':
    case 'th':
    case 'td':
      return childMd;
    case 'div':
      return `${childMd}\n`;
    default:
      return childMd;
  }
}

/* ── Toolbar button component ── */

function ToolbarBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      title={label}
      aria-label={label}
      className={`w-6 h-6 flex items-center justify-center transition-colors ${
        active
          ? 'bg-core_palette-primary-1 text-white'
          : 'text-semantic-system-5 hover:bg-semantic-surface hover:text-semantic-text'
      }`}
    >
      {icon}
    </button>
  );
}

function ToolbarSep() {
  return <div className="w-px h-4 bg-semantic-surface mx-0.5" />;
}

/* ── Main RichTextEditor ── */

interface RichTextEditorProps {
  value: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());

  // Initialize editor content from markdown
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      const html = markdownToHtml(value);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const emitChange = useCallback(() => {
    if (!editorRef.current) return;
    isInternalChange.current = true;
    const md = htmlToMarkdown(editorRef.current.innerHTML);
    onChange(md);
  }, [onChange]);

  const updateActiveFormats = useCallback(() => {
    const formats = new Set<string>();
    if (document.queryCommandState('bold')) formats.add('bold');
    if (document.queryCommandState('italic')) formats.add('italic');
    if (document.queryCommandState('strikeThrough')) formats.add('strikethrough');
    if (document.queryCommandState('insertUnorderedList')) formats.add('ul');
    if (document.queryCommandState('insertOrderedList')) formats.add('ol');
    const block = document.queryCommandValue('formatBlock');
    if (block) formats.add(block.toLowerCase());
    setActiveFormats(formats);
  }, []);

  const exec = useCallback((cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
    emitChange();
    updateActiveFormats();
  }, [emitChange, updateActiveFormats]);

  const formatBlock = useCallback((tag: string) => {
    document.execCommand('formatBlock', false, tag);
    editorRef.current?.focus();
    emitChange();
    updateActiveFormats();
  }, [emitChange, updateActiveFormats]);

  const insertCodeBlock = useCallback(() => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || 'code here';
    const pre = document.createElement('pre');
    const code = document.createElement('code');
    code.textContent = selectedText;
    pre.appendChild(code);

    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(pre);
      // Move cursor after the pre block
      range.setStartAfter(pre);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
    emitChange();
  }, [emitChange]);

  const insertLink = useCallback(() => {
    const sel = window.getSelection();
    const text = sel?.toString() || '';
    const url = prompt('Enter URL:', 'https://');
    if (url) {
      if (text) {
        exec('createLink', url);
      } else {
        const a = document.createElement('a');
        a.href = url;
        a.textContent = url;
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.insertNode(a);
          range.setStartAfter(a);
          range.collapse(true);
        }
        emitChange();
      }
    }
  }, [exec, emitChange]);

  const insertTable = useCallback(() => {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');
    const headerRow = document.createElement('tr');
    for (let i = 0; i < 3; i++) {
      const th = document.createElement('th');
      th.textContent = `Header ${i + 1}`;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    for (let r = 0; r < 2; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 3; c++) {
        const td = document.createElement('td');
        td.textContent = `Cell ${r + 1}-${c + 1}`;
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(thead);
    table.appendChild(tbody);

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(table);
      range.setStartAfter(table);
      range.collapse(true);
    }
    emitChange();
  }, [emitChange]);

  const insertHR = useCallback(() => {
    const hr = document.createElement('hr');
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(hr);
      range.setStartAfter(hr);
      range.collapse(true);
    }
    emitChange();
  }, [emitChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab indentation support
    if (e.key === 'Tab') {
      e.preventDefault();
      exec('insertText', '    ');
    }
  }, [exec]);

  const isEmpty = !value || value.trim() === '';

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1 border-b border-semantic-surface bg-[#FAFBFB] flex-wrap flex-shrink-0">
        <ToolbarBtn icon={<BoldIcon />} label="Bold (Ctrl+B)" onClick={() => exec('bold')} active={activeFormats.has('bold')} />
        <ToolbarBtn icon={<ItalicIcon />} label="Italic (Ctrl+I)" onClick={() => exec('italic')} active={activeFormats.has('italic')} />
        <ToolbarBtn icon={<StrikethroughIcon />} label="Strikethrough" onClick={() => exec('strikeThrough')} active={activeFormats.has('strikethrough')} />
        <ToolbarBtn icon={<CodeIcon />} label="Inline Code" onClick={() => exec('insertHTML', `<code>${window.getSelection()?.toString() || 'code'}</code>`)} />

        <ToolbarSep />

        <ToolbarBtn icon={<H1Icon />} label="Heading 1" onClick={() => formatBlock('h1')} active={activeFormats.has('h1')} />
        <ToolbarBtn icon={<H2Icon />} label="Heading 2" onClick={() => formatBlock('h2')} active={activeFormats.has('h2')} />
        <ToolbarBtn icon={<H3Icon />} label="Heading 3" onClick={() => formatBlock('h3')} active={activeFormats.has('h3')} />

        <ToolbarSep />

        <ToolbarBtn icon={<ULIcon />} label="Bullet List" onClick={() => exec('insertUnorderedList')} active={activeFormats.has('ul')} />
        <ToolbarBtn icon={<OLIcon />} label="Numbered List" onClick={() => exec('insertOrderedList')} active={activeFormats.has('ol')} />
        <ToolbarBtn icon={<BlockquoteIcon />} label="Blockquote" onClick={() => formatBlock('blockquote')} active={activeFormats.has('blockquote')} />

        <ToolbarSep />

        <ToolbarBtn icon={<CodeBlockIcon />} label="Code Block" onClick={insertCodeBlock} />
        <ToolbarBtn icon={<LinkIcon />} label="Insert Link" onClick={insertLink} />
        <ToolbarBtn icon={<TableIcon />} label="Insert Table" onClick={insertTable} />
        <ToolbarBtn icon={<HRIcon />} label="Horizontal Rule" onClick={insertHR} />

        <ToolbarSep />

        <ToolbarBtn icon={<UndoIcon />} label="Undo (Ctrl+Z)" onClick={() => exec('undo')} />
        <ToolbarBtn icon={<RedoIcon />} label="Redo (Ctrl+Y)" onClick={() => exec('redo')} />
      </div>

      {/* Editor area */}
      <div className="flex-1 overflow-auto relative">
        {isEmpty && !editorRef.current?.textContent && (
          <div className="absolute top-0 left-0 px-6 py-3 text-[0.875rem] text-[#999] pointer-events-none select-none">
            {placeholder || 'Start writing your document...'}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          onKeyDown={handleKeyDown}
          className="min-h-full px-6 py-3 text-[0.875rem] text-semantic-text leading-relaxed outline-none prose-editor"
          data-placeholder={placeholder}
        />
      </div>
    </div>
  );
}
