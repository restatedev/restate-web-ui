export function toUnit8Array(hexString: string) {
  if (hexString.length % 2 !== 0) {
    throw new Error('Hex string must have an even length');
  }

  // Create a Uint8Array with half the length of the hex string
  const byteArray = new Uint8Array(hexString.length / 2);

  // Iterate over each pair of hex digits
  for (let i = 0; i < hexString.length; i += 2) {
    // Convert the pair of hex digits to a byte
    byteArray[i / 2] = parseInt(hexString.slice(i, i + 2), 16);
  }

  return byteArray;
}
