import { calculateTextMetrics } from '../classical-ciphers/classical-ciphers.metrics';

export interface ParsedTextResult {
  words: string[];
  totalWords: number;
  totalChars: number;
  uniqueWords: number;
  hurstExponent: number;
  dfaAlpha: number;
  wordFrequencyEntropy: number;
}

export function parseBookText(rawText: string): ParsedTextResult {
  const bookText = removeGutenbergLicenseBlocks(rawText);
  const words = normalizeToWords(bookText);

  return {
    words,
    totalWords: words.length,
    totalChars: words.reduce((sum, word) => sum + word.length, 0),
    uniqueWords: new Set(words).size,
    ...calculateTextMetrics(words.join(' ')),
  };
}

function removeGutenbergLicenseBlocks(text: string): string {
  const startMatch = text.match(
    /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i,
  );
  const endMatch = text.match(
    /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i,
  );

  const contentStart = startMatch
    ? (startMatch.index ?? 0) + startMatch[0].length
    : 0;
  const contentEnd = endMatch?.index ?? text.length;

  return text.slice(contentStart, contentEnd);
}

function normalizeToWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}
