export interface TextMetrics {
  hurstExponent: number;
  dfaAlpha: number;
  wordFrequencyEntropy: number;
}

export function calculateTextMetrics(text: string): TextMetrics {
  const series = textToNumericSeries(text);

  return {
    hurstExponent: roundMetric(calculateHurstExponent(series)),
    dfaAlpha: roundMetric(calculateDfaAlpha(series)),
    wordFrequencyEntropy: roundMetric(calculateWordFrequencyEntropy(text)),
  };
}

function textToNumericSeries(text: string): number[] {
  const letters = text.toLowerCase().match(/\p{L}/gu) ?? [];

  return letters.map((letter) => letter.codePointAt(0) ?? 0);
}

function calculateHurstExponent(series: number[]): number {
  if (series.length < 8) {
    return 0.5;
  }

  const points: Array<{ x: number; y: number }> = [];
  const maxWindow = Math.min(Math.floor(series.length / 2), 128);

  for (let windowSize = 4; windowSize <= maxWindow; windowSize *= 2) {
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
  const maxScale = Math.min(Math.floor(series.length / 2), 128);

  for (let scale = 4; scale <= maxScale; scale *= 2) {
    const fluctuations: number[] = [];

    for (let start = 0; start + scale <= profile.length; start += scale) {
      const segment = profile.slice(start, start + scale);
      const rms = detrendedRootMeanSquare(segment);

      if (rms > 0) {
        fluctuations.push(rms);
      }
    }

    if (fluctuations.length > 0) {
      const fluctuation = average(fluctuations);
      if (fluctuation > 0) {
        points.push({ x: Math.log(scale), y: Math.log(fluctuation) });
      }
    }
  }

  return slopeOrDefault(points, 0.5);
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

function detrendedRootMeanSquare(segment: number[]): number {
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

  return Math.sqrt(squaredError / n);
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
