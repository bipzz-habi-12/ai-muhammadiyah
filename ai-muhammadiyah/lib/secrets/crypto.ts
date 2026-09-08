import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ivLength = 12;

function getKey() {
  const secret = process.env.USER_API_KEY_ENCRYPTION_KEY;

  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "USER_API_KEY_ENCRYPTION_KEY belum diset (minimal 32 karakter).",
    );
  }

  return createHash("sha256").update(secret).digest();
}

export function isUserApiKeyEncryptionConfigured() {
  const secret = process.env.USER_API_KEY_ENCRYPTION_KEY;
  return Boolean(secret && secret.trim().length >= 32);
}

export function encryptUserApiKey(plainText: string) {
  const iv = randomBytes(ivLength);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, "utf8"),
    cipher.final(),
  ]);

  return [
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptUserApiKey(payload: string) {
  try {
    const [ivPart, tagPart, dataPart] = payload.split(".");

    if (!ivPart || !tagPart || !dataPart) {
      return null;
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(ivPart, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64"));

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
}
