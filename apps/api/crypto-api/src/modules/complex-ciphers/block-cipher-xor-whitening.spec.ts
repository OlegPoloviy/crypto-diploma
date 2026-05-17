import {
  decryptBlockWithXorWhitening,
  deriveXorWhiteningKeys,
  encryptBlockWithXorWhitening,
  xorBytes,
} from './block-cipher-xor-whitening';
import { encryptAesBlock, decryptAesBlock } from './aes.engine';

describe('block-cipher-xor-whitening', () => {
  const key = Uint8Array.from({ length: 16 }, (_, index) => index);
  const block = Uint8Array.from({ length: 16 }, (_, index) => index + 0x10 });
  const whitening = deriveXorWhiteningKeys(key, 16);

  it('inverts XOR pre/post whitening around AES block encryption', () => {
    const roundKeys = [key];
    const encrypted = encryptBlockWithXorWhitening(
      block,
      roundKeys,
      whitening,
      (input, keys) => encryptAesBlock(input, keys[0]),
    );
    const decrypted = decryptBlockWithXorWhitening(
      encrypted,
      roundKeys,
      whitening,
      (input, keys) => decryptAesBlock(input, keys[0]),
    );

    expect(Array.from(decrypted)).toEqual(Array.from(block));
  });

  it('changes ciphertext compared to plain AES', () => {
    const plain = encryptAesBlock(block, key);
    const whitened = encryptBlockWithXorWhitening(
      block,
      [key],
      whitening,
      (input, keys) => encryptAesBlock(input, keys[0]),
    );

    expect(Array.from(whitened)).not.toEqual(Array.from(plain));
  });

  it('xorBytes is symmetric', () => {
    const left = Uint8Array.from([1, 2, 3]);
    const right = Uint8Array.from([4, 5, 6]);

    expect(Array.from(xorBytes(xorBytes(left, right), right))).toEqual(
      Array.from(left),
    );
  });
});
