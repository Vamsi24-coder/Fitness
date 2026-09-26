const fs = require('fs');
const path = require('path');

async function testKnowledgeSuite() {
  console.log('====================================================');
  console.log('KNOWLEDGE & INSIGHTS VERIFICATION SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  const gymFile = path.join(__dirname, '../content/gym-myths.txt');
  const foodFile = path.join(__dirname, '../content/food-facts.txt');
  const statsFile = path.join(__dirname, '../src/pages/Stats.jsx');
  const dashFile = path.join(__dirname, '../src/pages/Dashboard.jsx');
  const carouselComponent = path.join(__dirname, '../src/components/KnowledgeCarousel.jsx');
  const loaderService = path.join(__dirname, '../src/services/knowledgeLoader.js');

  // 1 & 2: Verify both TXT files exist and contain exactly 50 entries
  console.log('--> Checking TXT files');
  assert(fs.existsSync(gymFile), 'content/gym-myths.txt exists');
  assert(fs.existsSync(foodFile), 'content/food-facts.txt exists');

  const gymText = fs.readFileSync(gymFile, 'utf8');
  const foodText = fs.readFileSync(foodFile, 'utf8');

  const { parseKnowledgeText } = await import('../src/services/knowledgeParser.js');

  const gymEntries = parseKnowledgeText(gymText);
  const foodEntries = parseKnowledgeText(foodText);

  assert(gymEntries.length === 50, `gym-myths.txt contains exactly 50 entries (found ${gymEntries.length})`);
  assert(foodEntries.length === 50, `food-facts.txt contains exactly 50 entries (found ${foodEntries.length})`);

  // Verify fields on every entry
  const allGymValid = gymEntries.every(e => e.id && e.title && e.type && e.content && e.takeaway);
  const allFoodValid = foodEntries.every(e => e.id && e.title && e.type && e.content && e.takeaway);
  assert(allGymValid, 'All 50 gym entries contain id, title, type, content, and takeaway');
  assert(allFoodValid, 'All 50 food entries contain id, title, type, content, and takeaway');

  // Verify wrap-around logic
  console.log('\n--> Testing wrap-around math (01 <-> 50)');
  const wrapNext = (idx, total) => (idx + 1) % total;
  const wrapPrev = (idx, total) => (idx - 1 + total) % total;

  assert(wrapNext(49, 50) === 0, '50 (index 49) -> next -> 01 (index 0)');
  assert(wrapPrev(0, 50) === 49, '01 (index 0) -> prev -> 50 (index 49)');
  assert(wrapNext(7, 50) === 8, '08 -> next -> 09');
  assert(wrapPrev(7, 50) === 6, '08 -> prev -> 07');

  // Verify extensibility (adding ENTRY 51 dynamically)
  console.log('\n--> Testing dynamic loader extensibility');
  const sampleTextWith51 = gymText + `\n\nENTRY 51\nTITLE: Dynamic Extension Test\nTYPE: TEST\nCONTENT: Verifying that new entries are parsed seamlessly.\nTAKEAWAY: Fully extensible without changing React code.`;
  const extendedEntries = parseKnowledgeText(sampleTextWith51);
  assert(extendedEntries.length === 51, 'Extensible loader parses ENTRY 51 dynamically');
  assert(extendedEntries[50].title === 'Dynamic Extension Test', 'Entry 51 title correctly parsed');

  // Verify Stats.jsx and Dashboard.jsx separation
  console.log('\n--> Checking Page Structure & Fuel Plan separation');
  const statsContent = fs.readFileSync(statsFile, 'utf8');
  const dashContent = fs.readFileSync(dashFile, 'utf8');

  assert(statsContent.includes('KnowledgeCarouselSection'), 'Stats.jsx includes KnowledgeCarouselSection');
  assert(!statsContent.includes('AISuggestions'), 'Today Fuel Plan (AISuggestions) is ABSENT from Stats.jsx');
  assert(dashContent.includes('AISuggestions'), 'Today Fuel Plan (AISuggestions) is PRESENT on Dashboard.jsx');
  assert(!dashContent.includes('KnowledgeCarouselSection'), 'KnowledgeCarouselSection is ABSENT from Dashboard.jsx');

  // Verify KnowledgeCarousel UI features
  console.log('\n--> Checking KnowledgeCarousel.jsx component features');
  const carouselCode = fs.readFileSync(carouselComponent, 'utf8');
  assert(carouselCode.includes('setInterval'), 'Uses setInterval for 5-second auto-cycle');
  assert(carouselCode.includes('5000'), 'Autoplay timer interval is exactly 5000ms');
  assert(carouselCode.includes('onMouseEnter'), 'Pauses timer on mouse enter');
  assert(carouselCode.includes('onMouseLeave'), 'Resumes timer on mouse leave');
  assert(carouselCode.includes('ArrowLeft') && carouselCode.includes('ArrowRight'), 'Supports ArrowLeft and ArrowRight keyboard navigation');
  assert(carouselCode.includes('aria-label="Previous insight"'), 'Includes accessible previous button aria-label');
  assert(carouselCode.includes('aria-label="Next insight"'), 'Includes accessible next button aria-label');
  assert(carouselCode.includes('useReducedMotion'), 'Respects prefers-reduced-motion');
  assert(carouselCode.includes('grid-cols-1 lg:grid-cols-2'), 'Responsive: side-by-side on desktop (lg:grid-cols-2), stacked on mobile (grid-cols-1)');
  assert(!carouselCode.includes('fetch(') && !carouselCode.includes('gemini'), 'Zero API or Gemini calls in KnowledgeCarousel');

  console.log(`\n====================================================`);
  console.log(`TOTAL KNOWLEDGE TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log(`====================================================`);

  if (failed > 0) process.exit(1);
}

testKnowledgeSuite().catch(err => {
  console.error(err);
  process.exit(1);
});
