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

  it('calculates text DEA from letter values rather than word lengths', () => {
    const text = 'attack at dawn with steady pressure '.repeat(24);
    const encrypted = vigenereShift(text, 'key');

    const plainMetrics = calculateTextMetrics(text);
    const encryptedMetrics = calculateTextMetrics(encrypted);

    expect(encryptedMetrics.hurstExponent).toBe(plainMetrics.hurstExponent);
    expect(encryptedMetrics.dfaAlpha).toBe(plainMetrics.dfaAlpha);
    expect(encryptedMetrics.deaDelta).not.toBe(plainMetrics.deaDelta);
  });

  it('keeps byte metrics on raw byte values', () => {
    const metricsA = calculateByteMetrics(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8]));
    const metricsB = calculateByteMetrics(Uint8Array.from([8, 7, 6, 5, 4, 3, 2, 1]));

    expect(metricsA.wordFrequencyEntropy).toBe(3);
    expect(metricsB.wordFrequencyEntropy).toBe(3);
    expect(metricsA.hurstExponent).toEqual(expect.any(Number));
    expect(metricsB.dfaAlpha).toEqual(expect.any(Number));
    expect(metricsA.deaDelta).toEqual(expect.any(Number));
  });

  it('estimates DEA delta from Shannon entropy scaling over trajectories', () => {
    const alternating = Array.from({ length: 4096 }, (_, index) =>
      index % 2 === 0 ? 1 : 9,
    );
    let state = 0x12345678;
    const randomLike = Array.from({ length: 4096 }, () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return (state >>> 24) & 0xff;
    });

    const structuredMetrics = calculateByteMetrics(Uint8Array.from(alternating));
    const randomLikeMetrics = calculateByteMetrics(Uint8Array.from(randomLike));

    expect(structuredMetrics.deaDelta).toBeGreaterThanOrEqual(0);
    expect(randomLikeMetrics.deaDelta).toBeGreaterThan(0);
  });
});

function makeWord(length: number, index: number, offset: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';

  return Array.from(
    { length },
    (_, charIndex) => alphabet[(index + offset + charIndex) % alphabet.length],
  ).join('');
}

function vigenereShift(text: string, key: string): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const shifts = Array.from(key).map((char) => alphabet.indexOf(char));
  let letterIndex = 0;

  return Array.from(text)
    .map((char) => {
      const index = alphabet.indexOf(char);
      if (index === -1) {
        return char;
      }

      const shift = shifts[letterIndex % shifts.length];
      letterIndex += 1;

      return alphabet[(index + shift) % alphabet.length];
    })
    .join('');
}
