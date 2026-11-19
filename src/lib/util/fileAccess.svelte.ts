// Open/save local .mmd and .md files via the File System Access API (Edge/Chrome).
import { inputState, updateCode } from './state.svelte.js';

type Handle = FileSystemFileHandle & {
  createWritable(): Promise<{ write(data: string): Promise<void>; close(): Promise<void> }>;
};
type PickerWindow = Window & {
  showOpenFilePicker(options?: object): Promise<Handle[]>;
  showSaveFilePicker(options?: object): Promise<Handle>;
};
const picker = () => window as unknown as PickerWindow;

const types = [{ description: 'Mermaid', accept: { 'text/plain': ['.mmd', '.mermaid', '.md'] } }];
const mermaidBlock = /```mermaid[^\n]*\n([\s\S]*?)```/;

let handle: Handle | undefined;
// For .md files: full text with the first mermaid block, so the rest stays untouched.
let markdown: string | undefined;
// Keep the file's line endings (the editor may use CRLF on Windows).
let eol = '\n';

export const file = $state({ name: '' });

export const isSupported = () => typeof window !== 'undefined' && 'showOpenFilePicker' in window;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === 'AbortError';

export const openFile = async () => {
  try {
    [handle] = await picker().showOpenFilePicker({ types });
  } catch (error) {
    if (isAbort(error)) return;
    throw error;
  }
  const text = await (await handle.getFile()).text();
  const match = handle.name.toLowerCase().endsWith('.md') ? mermaidBlock.exec(text) : null;
  markdown = match ? text : undefined;
  eol = text.includes('\r\n') ? '\r\n' : '\n';
  updateCode(match ? match[1].trimEnd() : text, { updateDiagram: true, resetPanZoom: true });
  file.name = handle.name;
};

export const saveFile = async (saveAs = false) => {
  if (!handle || saveAs) {
    try {
      handle = await picker().showSaveFilePicker({
        types,
        suggestedName: file.name || 'diagram.mmd'
      });
    } catch (error) {
      if (isAbort(error)) return;
      throw error;
    }
    if (!handle.name.toLowerCase().endsWith('.md')) markdown = undefined;
  }
  const code = inputState.code.replace(/\r?\n/g, eol);
  let content = code;
  if (markdown !== undefined) {
    content = mermaidBlock.test(markdown)
      ? markdown.replace(mermaidBlock, (block) =>
          block.replace(/\n[\s\S]*?```$/, () => `\n${code}${eol}\`\`\``)
        )
      : `${markdown}${eol}${eol}\`\`\`mermaid${eol}${code}${eol}\`\`\`${eol}`;
    markdown = content;
  }
  const writable = await handle.createWritable();
  await writable.write(content);
  await writable.close();
  file.name = handle.name;
};

/** Save a generated export (PNG/SVG/…) with a file dialog. Returns false if unsupported. */
export const saveExport = async (name: string, data: Blob): Promise<boolean> => {
  if (!isSupported()) return false;
  const ext = name.split('.').pop() ?? '';
  const base = file.name.replace(/\.[^.]+$/, '');
  try {
    const target = await picker().showSaveFilePicker({
      suggestedName: base ? `${base}.${ext}` : name,
      types: [
        {
          description: ext.toUpperCase(),
          accept: { [data.type || 'application/octet-stream']: [`.${ext}`] }
        }
      ]
    });
    const writable = await target.createWritable();
    await (writable as unknown as { write(d: Blob): Promise<void> }).write(data);
    await writable.close();
  } catch (error) {
    if (!isAbort(error)) throw error;
  }
  return true;
};
