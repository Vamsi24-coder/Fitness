/**
 * Robust, extensible parser for knowledge text files.
 * Format:
 * ENTRY 01
 * TITLE: ...
 * TYPE: ...
 * CONTENT: ...
 * TAKEAWAY: ...
 *
 * Supports arbitrary number of entries (ENTRY 51, ENTRY 52, etc.) without code modifications.
 *
 * @param {string} rawText
 * @returns {Array<{ id: number, entryLabel: string, title: string, type: string, content: string, takeaway: string }>}
 */
export function parseKnowledgeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];

  // Normalize Windows CRLF line endings to LF
  const normalized = rawText.replace(/\r\n/g, '\n');

  // Split on ENTRY markers
  const rawBlocks = normalized.split(/\n(?=ENTRY\s+\d+)/i);
  const entries = [];

  for (const block of rawBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const entryNumMatch = trimmed.match(/^ENTRY\s+(\d+)/i);
    const titleMatch = trimmed.match(/^TITLE:\s*(.+)$/im);
    const typeMatch = trimmed.match(/^TYPE:\s*(.+)$/im);
    const contentMatch = trimmed.match(/^CONTENT:\s*([\s\S]+?)(?=\nTAKEAWAY:|$)/im);
    const takeawayMatch = trimmed.match(/^TAKEAWAY:\s*([\s\S]+?)$/im);

    if (titleMatch && contentMatch) {
      const id = entryNumMatch ? Number(entryNumMatch[1]) : entries.length + 1;
      entries.push({
        id,
        entryLabel: entryNumMatch ? entryNumMatch[0].toUpperCase() : `ENTRY ${String(id).padStart(2, '0')}`,
        title: titleMatch[1].trim(),
        type: typeMatch ? typeMatch[1].trim().toUpperCase() : 'INSIGHT',
        content: contentMatch[1].trim().replace(/\s*\n\s*/g, ' '),
        takeaway: takeawayMatch ? takeawayMatch[1].trim().replace(/\s*\n\s*/g, ' ') : '',
      });
    }
  }

  return entries;
}
