const fs = require('fs');
const path = require('path');

function parseKnowledgeText(rawText) {
  if (!rawText || typeof rawText !== 'string') return [];
  
  // Normalize line endings to \n
  const normalized = rawText.replace(/\r\n/g, '\n');
  
  // Split on ENTRY followed by numbers or digits
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
      entries.push({
        id: entryNumMatch ? Number(entryNumMatch[1]) : entries.length + 1,
        entryLabel: entryNumMatch ? entryNumMatch[0].toUpperCase() : `ENTRY ${String(entries.length + 1).padStart(2, '0')}`,
        title: titleMatch[1].trim(),
        type: typeMatch ? typeMatch[1].trim().toUpperCase() : 'INSIGHT',
        content: contentMatch[1].trim().replace(/\s*\n\s*/g, ' '),
        takeaway: takeawayMatch ? takeawayMatch[1].trim().replace(/\s*\n\s*/g, ' ') : '',
      });
    }
  }

  return entries;
}

const gymPath = path.join(__dirname, '../content/gym-myths.txt');
const foodPath = path.join(__dirname, '../content/food-facts.txt');

const gymText = fs.readFileSync(gymPath, 'utf8');
const foodText = fs.readFileSync(foodPath, 'utf8');

const gymEntries = parseKnowledgeText(gymText);
const foodEntries = parseKnowledgeText(foodText);

console.log('Gym Myths entries parsed:', gymEntries.length);
console.log('Food Facts entries parsed:', foodEntries.length);

let failed = false;
if (gymEntries.length !== 50) {
  console.error('FAIL: Expected 50 gym entries, got', gymEntries.length);
  failed = true;
}
if (foodEntries.length !== 50) {
  console.error('FAIL: Expected 50 food entries, got', foodEntries.length);
  failed = true;
}

// Check first and last entries
console.log('\nGym Entry 01:', gymEntries[0]);
console.log('\nGym Entry 50:', gymEntries[49]);
console.log('\nFood Entry 01:', foodEntries[0]);
console.log('\nFood Entry 50:', foodEntries[49]);

if (failed) {
  process.exit(1);
} else {
  console.log('\nALL 100 ENTRIES PARSED SUCCESSFULLY!');
}
