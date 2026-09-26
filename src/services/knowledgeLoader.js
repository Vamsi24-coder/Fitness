import gymMythsRaw from '../../content/gym-myths.txt?raw';
import foodFactsRaw from '../../content/food-facts.txt?raw';
import { parseKnowledgeText } from './knowledgeParser.js';

export { parseKnowledgeText };

// Cached parsed entries in memory
let cachedGymEntries = null;
let cachedFoodEntries = null;

export function getGymMythsEntries() {
  if (!cachedGymEntries) {
    cachedGymEntries = parseKnowledgeText(gymMythsRaw);
  }
  return cachedGymEntries;
}

export function getFoodFactsEntries() {
  if (!cachedFoodEntries) {
    cachedFoodEntries = parseKnowledgeText(foodFactsRaw);
  }
  return cachedFoodEntries;
}
