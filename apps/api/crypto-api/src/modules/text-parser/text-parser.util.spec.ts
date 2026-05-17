import {
  hasGutenbergMarkers,
  parsePlainText,
  TextPreprocessMode,
} from './text-parser.util';

describe('parsePlainText', () => {
  const gutenbergBody = `
    Header that should disappear
    *** START OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
    The quick, brown fox jumps 42 times.
    THE quick fox!
    *** END OF THE PROJECT GUTENBERG EBOOK SAMPLE ***
    License that should disappear
  `;

  it('strips Gutenberg blocks in gutenberg mode', () => {
    const result = parsePlainText(gutenbergBody, {
      preprocess: TextPreprocessMode.GUTENBERG,
    });

    expect(result.words).toEqual([
      'the',
      'quick',
      'brown',
      'fox',
      'jumps',
      'times',
      'the',
      'quick',
      'fox',
    ]);
  });

  it('auto mode strips Gutenberg only when markers exist', () => {
    const autoResult = parsePlainText(gutenbergBody, {
      preprocess: TextPreprocessMode.AUTO,
    });
    const noneResult = parsePlainText('Hello world', {
      preprocess: TextPreprocessMode.NONE,
    });

    expect(autoResult.words).toContain('quick');
    expect(autoResult.words).not.toContain('license');
    expect(noneResult.words).toEqual(['hello', 'world']);
  });

  it('none mode keeps preamble text as words', () => {
    const result = parsePlainText(gutenbergBody, {
      preprocess: TextPreprocessMode.NONE,
    });

    expect(result.words[0]).toBe('header');
  });

  it('detects Gutenberg markers', () => {
    expect(hasGutenbergMarkers(gutenbergBody)).toBe(true);
    expect(hasGutenbergMarkers('plain essay text')).toBe(false);
  });
});
