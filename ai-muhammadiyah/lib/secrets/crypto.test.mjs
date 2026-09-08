import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

const originalSecret = process.env.USER_API_KEY_ENCRYPTION_KEY;
const {
  decryptUserApiKey,
  encryptUserApiKey,
  isUserApiKeyEncryptionConfigured,
} = await import("./crypto.ts");

beforeEach(() => {
  process.env.USER_API_KEY_ENCRYPTION_KEY =
    "test-only-key-with-more-than-thirty-two-characters";
});

afterEach(() => {
  if (originalSecret === undefined) {
    delete process.env.USER_API_KEY_ENCRYPTION_KEY;
  } else {
    process.env.USER_API_KEY_ENCRYPTION_KEY = originalSecret;
  }
});

test("API key terenkripsi dapat didekripsi kembali", () => {
  const apiKey = "sk-test-secret-value";
  const encrypted = encryptUserApiKey(apiKey);

  assert.notEqual(encrypted, apiKey);
  assert.equal(decryptUserApiKey(encrypted), apiKey);
});

test("ciphertext yang dirusak ditolak", () => {
  const encrypted = encryptUserApiKey("sk-test-secret-value");
  const corrupted = `${encrypted.slice(0, -3)}abc`;

  assert.equal(decryptUserApiKey(corrupted), null);
});

test("vault menolak env enkripsi yang terlalu pendek", () => {
  process.env.USER_API_KEY_ENCRYPTION_KEY = "pendek";

  assert.equal(isUserApiKeyEncryptionConfigured(), false);
  assert.throws(() => encryptUserApiKey("secret"), /minimal 32 karakter/);
});
