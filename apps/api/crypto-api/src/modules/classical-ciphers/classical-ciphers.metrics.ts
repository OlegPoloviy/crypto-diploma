export interface TextMetrics {
  hurstExponent: number;
  dfaAlpha: number;
  deaDelta: number;
  wordFrequencyEntropy: number;
}

export function calculateTextMetrics(text: string): TextMetrics {
  const wordLengthSeries = textToWordLengthSeries(text);
  const deaSeries = textToLetterValueSeries(text);

  return {
    hurstExponent: roundMetric(calculateHurstExponent(wordLengthSeries)),
    dfaAlpha: roundMetric(calculateDfaAlpha(wordLengthSeries)),
    deaDelta: roundMetric(calculateDeaDelta(deaSeries)),
    wordFrequencyEntropy: roundMetric(calculateWordFrequencyEntropy(text)),
  };
}

export function calculateByteMetrics(bytes: Uint8Array): TextMetrics {
  const series = bytesToNumericSeries(bytes);

  return {
    hurstExponent: roundMetric(calculateHurstExponent(series)),
    dfaAlpha: roundMetric(calculateDfaAlpha(series)),
    deaDelta: roundMetric(calculateDeaDelta(series)),
    wordFrequencyEntropy: roundMetric(calculateSeriesEntropy(series)),
  };
}

function textToWordLengthSeries(text: string): number[] {
  const words = text.toLowerCase().match(/\p{L}+/gu) ?? [];

  return words.map((word) => Array.from(word).length);
}

function textToLetterValueSeries(text: string): number[] {
  const letters = text.toLowerCase().match(/\p{L}/gu) ?? [];

  return letters.map((letter) => letter.codePointAt(0) ?? 0);
}

function bytesToNumericSeries(bytes: Uint8Array): number[] {
  return Array.from(bytes);
}

function calculateHurstExponent(series: number[]): number {
  if (series.length < 8) {
    return 0.5;
  }

  const points: Array<{ x: number; y: number }> = [];
  const maxWindow = Math.min(Math.floor(series.length / 4), 65536);

  for (let windowSize = 8; windowSize <= maxWindow; windowSize *= 2) {
    const ranges: number[] = [];

    for (
      let start = 0;
      start + windowSize <= series.length;
      start += windowSize
    ) {
      const window = series.slice(start, start + windowSize);
      const mean = average(window);
      let cumulative = 0;
      let min = 0;
      let max = 0;

      for (const value of window) {
        cumulative += value - mean;
        min = Math.min(min, cumulative);
        max = Math.max(max, cumulative);
      }

      const std = standardDeviation(window, mean);
      if (std > 0) {
        ranges.push((max - min) / std);
      }
    }

    if (ranges.length > 0) {
      const rs = average(ranges);
      if (rs > 0) {
        points.push({ x: Math.log(windowSize), y: Math.log(rs) });
      }
    }
  }

  return slopeOrDefault(points, 0.5);
}

function calculateDfaAlpha(series: number[]): number {
  if (series.length < 8) {
    return 0.5;
  }

  const mean = average(series);
  let cumulative = 0;
  const profile = series.map((value) => {
    cumulative += value - mean;
    return cumulative;
  });
  const points: Array<{ x: number; y: number }> = [];
  const maxScale = Math.min(Math.floor(series.length / 4), 131072);

  for (let scale = 8; scale <= maxScale; scale *= 2) {
    let totalSquaredError = 0;
    let totalPoints = 0;

    for (let start = 0; start + scale <= profile.length; start += scale) {
      const segment = profile.slice(start, start + scale);
      const detrended = detrendedSquaredError(segment);

      totalSquaredError += detrended.squaredError;
      totalPoints += detrended.points;
    }

    if (totalPoints > 0) {
      const fluctuation = Math.sqrt(totalSquaredError / totalPoints);
      if (fluctuation > 0) {
        points.push({ x: Math.log(scale), y: Math.log(fluctuation) });
      }
    }
  }

  return slopeOrDefault(points, 0.5);
}

function calculateDeaDelta(series: number[]): number {
  if (series.length < 8) {
    return 0.5;
  }

  const points: Array<{ x: number; y: number }> = [];
  const prefixSums = new Array<number>(series.length + 1).fill(0);

  for (let index = 0; index < series.length; index += 1) {
    prefixSums[index + 1] = prefixSums[index] + series[index];
  }

  const maxScale = Math.min(Math.floor(series.length / 4), 4096);
  const binWidth = estimateHistogramBinWidth(series);

  for (let scale = 2; scale <= maxScale; scale *= 2) {
    const trajectoryCount = series.length - scale + 1;
    if (trajectoryCount < 2) {
      continue;
    }

    const bins = new Map<number, number>();
    for (let start = 0; start < trajectoryCount; start += 1) {
      const position = prefixSums[start + scale] - prefixSums[start];
      const bin = Math.floor(position / binWidth);
      bins.set(bin, (bins.get(bin) ?? 0) + 1);
    }

    const entropy = calculateHistogramEntropy(bins, trajectoryCount);
    if (entropy > 0) {
      points.push({ x: Math.log(scale), y: entropy });
    }
  }

  return slopeOrDefault(points, points.length === 0 ? 0 : 0.5);
}

function calculateWordFrequencyEntropy(text: string): number {
  const words =
    text
      .toLowerCase()
      .match(/\p{L}+/gu)
      ?.filter(Boolean) ?? [];

  if (words.length === 0) {
    return 0;
  }

  const counts = new Map<string, number>();
  for (const word of words) {
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / words.length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

function calculateSeriesEntropy(series: number[]): number {
  if (series.length === 0) {
    return 0;
  }

  const counts = new Map<number, number>();
  for (const value of series) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  let entropy = 0;
  for (const count of counts.values()) {
    const probability = count / series.length;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

function calculateHistogramEntropy(
  bins: Map<number, number>,
  total: number,
): number {
  let entropy = 0;
  for (const count of bins.values()) {
    const probability = count / total;
    entropy -= probability * Math.log(probability);
  }

  return entropy;
}

function estimateHistogramBinWidth(series: number[]): number {
  const sortedUnique = Array.from(new Set(series)).sort((a, b) => a - b);
  let minPositiveDiff = Number.POSITIVE_INFINITY;

  for (let index = 1; index < sortedUnique.length; index += 1) {
    const diff = sortedUnique[index] - sortedUnique[index - 1];
    if (diff > 0 && diff < minPositiveDiff) {
      minPositiveDiff = diff;
    }
  }

  return Number.isFinite(minPositiveDiff) ? minPositiveDiff : 1;
}

function detrendedSquaredError(segment: number[]): {
  squaredError: number;
  points: number;
} {
  const n = segment.length;
  const xMean = (n - 1) / 2;
  const yMean = average(segment);
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i += 1) {
    numerator += (i - xMean) * (segment[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  const squaredError = segment.reduce((sum, value, index) => {
    const trend = slope * index + intercept;
    return sum + (value - trend) ** 2;
  }, 0);

  return { squaredError, points: n };
}

function slopeOrDefault(
  points: Array<{ x: number; y: number }>,
  fallback: number,
): number {
  if (points.length < 2) {
    return fallback;
  }

  const xMean = average(points.map((point) => point.x));
  const yMean = average(points.map((point) => point.y));
  let numerator = 0;
  let denominator = 0;

  for (const point of points) {
    numerator += (point.x - xMean) * (point.y - yMean);
    denominator += (point.x - xMean) ** 2;
  }

  if (denominator === 0) {
    return fallback;
  }

  return numerator / denominator;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], mean = average(values)): number {
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;

  return Math.sqrt(variance);
}

function roundMetric(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.5;
  }

  return Math.round(value * 10000) / 10000;
}
