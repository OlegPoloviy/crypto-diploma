import {
  addBlocksMod,
  decryptKalyna,
  decryptKalynaBlock,
  encryptKalyna,
  encryptKalynaBlock,
  parseBytes,
  subBlocksMod,
} from './kalyna.engine';
import { AesMode, BinaryEncoding } from './complex-ciphers.types';

function xorBlocks(left: Uint8Array, right: Uint8Array): Uint8Array {
  const result = new Uint8Array(left.length);
  for (let i = 0; i < left.length; i += 1) {
    result[i] = left[i] ^ right[i];
  }
  return result;
}

describe('kalyna.engine', () => {
  it('uses additive whitening that differs from XOR', () => {
    const a = parseBytes('101112131415161718191a1b1c1d1e1f', BinaryEncoding.HEX, 'a');
    const b = parseBytes('202122232425262728292a2b2c2d2e2f', BinaryEncoding.HEX, 'b');
    const additive = addBlocksMod(a, b, 128);
    const xored = xorBlocks(a, b);

    expect(Buffer.from(additive).toString('hex')).not.toBe(
      Buffer.from(xored).toString('hex'),
    );
  });

  it('inverts additive whitening with subBlocksMod', () => {
    const a = parseBytes('404142434445464748494a4b4c4d4e4f', BinaryEncoding.HEX, 'a');
    const b = parseBytes('505152535455565758595a5b5c5d5e5f', BinaryEncoding.HEX, 'b');
    const sum = addBlocksMod(a, b, 128);
    const restored = subBlocksMod(sum, b, 128);
    expect(Buffer.from(restored).toString('hex')).toBe(
      Buffer.from(a).toString('hex'),
    );
  });

  it('matches Kalyna-128/128 ECB reference vector', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const plaintext = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const expected = parseBytes(
      '81bf1c7d779bac20e1c9ea39b4d2ad06',
      BinaryEncoding.HEX,
      'ciphertext',
    );

    const ciphertext = encryptKalynaBlock(plaintext, key, 128);
    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
    expect(
      Buffer.from(decryptKalynaBlock(ciphertext, key, 128)).toString('hex'),
    ).toBe(Buffer.from(plaintext).toString('hex'));
  });

  it('matches Kalyna-128/256 ECB reference vector', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'key',
    );
    const plaintext = parseBytes(
      '202122232425262728292a2b2c2d2e2f',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const expected = parseBytes(
      '58ec3e091000158a1148f7166f334f14',
      BinaryEncoding.HEX,
      'ciphertext',
    );

    const ciphertext = encryptKalynaBlock(plaintext, key, 128);
    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
  });

  it('matches Kalyna-256/256 ECB reference vector', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'key',
    );
    const plaintext = parseBytes(
      '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const expected = parseBytes(
      'f66e3d570ec92135aedae323dcbd2a8ca03963ec206a0d5a88385c24617fd92c',
      BinaryEncoding.HEX,
      'ciphertext',
    );

    const ciphertext = encryptKalynaBlock(plaintext, key, 256);
    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
  });

  it('matches Kalyna-256/512 ECB reference vector', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
      BinaryEncoding.HEX,
      'key',
    );
    const plaintext = parseBytes(
      '404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const expected = parseBytes(
      '606990e9e6b7b67a4bd6d893d72268b78e02c83c3cd7e102fd2e74a8fdfe5dd9',
      BinaryEncoding.HEX,
      'ciphertext',
    );

    const ciphertext = encryptKalynaBlock(plaintext, key, 256);
    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
  });

  it('matches Kalyna-512/512 ECB reference vector', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f',
      BinaryEncoding.HEX,
      'key',
    );
    const plaintext = parseBytes(
      '404142434445464748494a4b4c4d4e4f505152535455565758595a5b5c5d5e5f606162636465666768696a6b6c6d6e6f707172737475767778797a7b7c7d7e7f',
      BinaryEncoding.HEX,
      'plaintext',
    );
    const expected = parseBytes(
      '4a26e31b811c356aa61dd6ca0596231a67ba8354aa47f3a13e1deec320eb56b895d0f417175bab662fd6f134bb15c86ccb906a26856efeb7c5bc6472940dd9d9',
      BinaryEncoding.HEX,
      'ciphertext',
    );

    const ciphertext = encryptKalynaBlock(plaintext, key, 512);
    expect(Buffer.from(ciphertext).toString('hex')).toBe(
      Buffer.from(expected).toString('hex'),
    );
  });

  it('CBC differs from XOR-chained Kalyna on the same inputs', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const iv = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'iv',
    );
    const plaintext = parseBytes(
      '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f',
      BinaryEncoding.HEX,
      'plaintext',
    );

    const additive = encryptKalyna(plaintext, key, {
      blockSizeBits: 128,
      mode: AesMode.CBC,
      iv,
    }).ciphertext;

    const padLen = 16 - (plaintext.length % 16);
    const padded = Uint8Array.from([
      ...plaintext,
      ...Array(padLen).fill(padLen),
    ]);
    let previous = iv;
    const xorCipher: number[] = [];
    for (let offset = 0; offset < padded.length; offset += 16) {
      let block: Uint8Array = padded.slice(offset, offset + 16);
      block = xorBlocks(block, previous);
      const encrypted = encryptKalynaBlock(block, key, 128);
      xorCipher.push(...encrypted);
      previous = encrypted;
    }

    expect(Buffer.from(additive).toString('hex')).not.toBe(
      Buffer.from(Uint8Array.from(xorCipher)).toString('hex'),
    );
  });

  it('round-trips Kalyna-128 CBC with additive whitening', () => {
    const key = parseBytes(
      '000102030405060708090a0b0c0d0e0f',
      BinaryEncoding.HEX,
      'key',
    );
    const iv = parseBytes(
      '101112131415161718191a1b1c1d1e1f',
      BinaryEncoding.HEX,
      'iv',
    );
    const plaintext = parseBytes(
      '202122232425262728292a2b2c2d2e2f303132333435363738393a3b3c3d3e3f404142434445464748494a4b4c4d4e4f',
      BinaryEncoding.HEX,
      'plaintext',
    );

    const encrypted = encryptKalyna(plaintext, key, {
      blockSizeBits: 128,
      mode: AesMode.CBC,
      iv,
    });

    const decrypted = decryptKalyna(encrypted.ciphertext, key, {
      blockSizeBits: 128,
      mode: AesMode.CBC,
      iv,
    });
    expect(Buffer.from(decrypted.plaintext).toString('hex')).toBe(
      Buffer.from(plaintext).toString('hex'),
    );
  });
});
