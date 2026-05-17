import { calculateByteMetrics, calculateTextMetrics } from './classical-ciphers.metrics';

describe('calculateTextMetrics', () => {
  it('calculates Hurst and DFA from word lengths rather than letter indexes', () => {
    const lengths = Array.from({ length: 96 }, (_, index) => 3 + (index % 11));
    const textA = lengths
      .map((length, index) => makeWord(length, index, 0))
      .join(' ');
    const textB = lengths
      .map((length, index) => makeWord(length, index, 13))
      .join(' ');

    const metricsA = calculateTextMetrics(textA);
    const metricsB = calculateTextMetrics(textB);

    expect(metricsA.hurstExponent).toBe(metricsB.hurstExponent);
    expect(metricsA.dfaAlpha).toBe(metricsB.dfaAlpha);
  });

  it('keeps byte metrics on raw byte values', () => {
    const metricsA = calculateByteMetrics(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    const metricsB = calculateByteMetrics(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]));

    expect(metricsA.wordFrequencyEntropy).toBe(3);
    expect(metricsB.wordFrequencyEntropy).toBe(3);
    expect(metricsA.hurstExponent).toEqual(expect.any(Number));
    expect(metricsB.dfaAlpha).toEqual(expect.any(Number));
  });
});

function makeWord(length: number, index: number, offset: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';

  return Array.from(
    { length },
    (_, charIndex) => alphabet[(index + offset + charIndex) % alphabet.length],
  ).join('');
}
