import { KALYNA_REDUCTION_POLYNOMIAL } from './kalyna.constants';

/** GF(2^8) multiplication for Kalyna MixColumns (DSTU reduction polynomial 0x011d). */
export function galoisMul(x: number, y: number): number {
  let a = x & 0xff;
  let b = y & 0xff;
  let result = 0;

  while (b > 0) {
    if (b & 1) {
      result ^= a;
    }
    const highBit = a & 0x80;
    a = (a << 1) & 0xff;
    if (highBit) {
      a ^= KALYNA_REDUCTION_POLYNOMIAL;
    }
    b >>= 1;
  }

  return result & 0xff;
}

const GALOIS_MUL_TABLE: number[][] = Array.from({ length: 256 }, () =>
  new Array(256),
);

for (let x = 0; x < 256; x += 1) {
  for (let y = 0; y < 256; y += 1) {
    GALOIS_MUL_TABLE[x][y] = galoisMul(x, y);
  }
}

export function galoisMulLookup(x: number, y: number): number {
  return GALOIS_MUL_TABLE[x & 0xff][y & 0xff];
}
