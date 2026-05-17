import { calculateTextMetrics } from '../classical-ciphers/classical-ciphers.metrics';

export enum TextPreprocessMode {
  NONE = 'none',
  GUTENBERG = 'gutenberg',
  AUTO = 'auto',
}

export interface ParsePlainTextOptions {
  preprocess?: TextPreprocessMode;
}

export interface ParsedTextResult {
  words: string[];
  totalWords: number;
  totalChars: number;
  uniqueWords: number;
  hurstExponent: number;
  dfaAlpha: number;
  wordFrequencyEntropy: number;
}

const GUTENBERG_START =
  /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;
const GUTENBERG_END =
  /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[\s\S]*?\*\*\*/i;

export function parsePlainText(
  rawText: string,
  options: ParsePlainTextOptions = {},
): ParsedTextResult {
  const preprocess = options.preprocess ?? TextPreprocessMode.AUTO;
  const cleaned = preprocessText(rawText, preprocess);
  const words = normalizeToWords(cleaned);

  return {
    words,
    totalWords: words.length,
    totalChars: words.reduce((sum, word) => sum + word.length, 0),
    uniqueWords: new Set(words).size,
    ...calculateTextMetrics(words.join(' ')),
  };
}

/** @deprecated Use parsePlainText instead */
export function parseBookText(rawText: string): ParsedTextResult {
  return parsePlainText(rawText, {
    preprocess: TextPreprocessMode.GUTENBERG,
  });
}

export function hasGutenbergMarkers(text: string): boolean {
  return GUTENBERG_START.test(text) || GUTENBERG_END.test(text);
}

export function preprocessRawText(
  text: string,
  mode: TextPreprocessMode = TextPreprocessMode.AUTO,
): string {
  return preprocessText(text, mode);
}

function preprocessText(
  text: string,
  mode: TextPreprocessMode,
): string {
  switch (mode) {
    case TextPreprocessMode.NONE:
      return text;
    case TextPreprocessMode.GUTENBERG:
      return removeGutenbergLicenseBlocks(text);
    case TextPreprocessMode.AUTO:
      return hasGutenbergMarkers(text)
        ? removeGutenbergLicenseBlocks(text)
        : text;
    default:
      return text;
  }
}

function removeGutenbergLicenseBlocks(text: string): string {
  const startMatch = text.match(GUTENBERG_START);
  const endMatch = text.match(GUTENBERG_END);

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
