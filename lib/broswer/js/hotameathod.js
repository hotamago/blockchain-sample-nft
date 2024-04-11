async function sha256(msgBuffer) {
  // hash the message
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);

  return hashBuffer;
}
async function random32BytesWithSeed(pubkey, seed, programId) {
  const buffer = new Uint8Array([
    ...pubkey.toBytes(),
    ...new TextEncoder().encode(seed),
    ...programId.toBytes(),
  ]);
  const hashRandom = await sha256(buffer);
  return new Uint8Array(hashRandom);
}
