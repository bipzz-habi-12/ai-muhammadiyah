import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "node:crypto";

// Enkripsi refresh token connector (lihat migrasi 20260814000000_user_connections.sql,
// pertahanan lapis 2). SERVER-ONLY — jangan pernah diimpor dari komponen klien.
//
// AES-256-GCM dipilih karena ia authenticated encryption: ciphertext yang
// diubah-ubah akan GAGAL saat didekripsi, bukan menghasilkan sampah diam-diam.
// Mode tanpa autentikasi (mis. CBC) akan membuat baris DB yang dirusak
// tampak seperti token valid yang aneh.
//
// Format tersimpan: base64(iv).base64(authTag).base64(ciphertext)
// IV di-generate acak per operasi — WAJIB, karena memakai ulang IV pada GCM
// dengan kunci yang sama membocorkan plaintext.

const ivLength = 12; // 96 bit, panjang IV standar untuk GCM.

function getKey(): Buffer {
  const secret = process.env.CONNECTION_ENCRYPTION_KEY;

  if (!secret || secret.trim().length < 32) {
    throw new Error(
      "CONNECTION_ENCRYPTION_KEY belum diset (minimal 32 karakter). Connector tidak bisa menyimpan token dengan aman.",
    );
  }

  // Diturunkan lewat SHA-256 supaya panjang kunci selalu tepat 32 byte apa pun
  // panjang nilai env-nya.
  return createHash("sha256").update(secret).digest();
}

export function isConnectionEncryptionConfigured() {
  const secret = process.env.CONNECTION_ENCRYPTION_KEY;
  return Boolean(secret && secret.trim().length >= 32);
}

export function encryptSecret(plainText: string): string {
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

/** Mengembalikan null (bukan melempar) bila ciphertext rusak atau kuncinya
 *  berubah — pemanggil memperlakukannya sebagai "koneksi perlu disambung
 *  ulang", yang jauh lebih berguna bagi pengguna daripada 500. */
export function decryptSecret(payload: string): string | null {
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
