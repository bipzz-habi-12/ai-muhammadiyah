import assert from "node:assert/strict";
import test from "node:test";

const { needsWebSearch } = await import("./web-search.ts");

test("pertanyaan kemampuan penelusuran web memicu jalur search", () => {
  assert.equal(needsWebSearch("Apakah kamu bisa penelusuran web?"), true);
  assert.equal(needsWebSearch("kamu tidak bisa pencarian web ya?"), true);
  assert.equal(needsWebSearch("Bisa cari di internet tidak?"), true);
  assert.equal(needsWebSearch("Can you search the web?"), true);
  assert.equal(needsWebSearch("Do you have web search?"), true);
});

test("permintaan telusuri eksplisit memicu jalur search", () => {
  assert.equal(needsWebSearch("Coba cari di google siapa presiden Indonesia"), true);
  assert.equal(needsWebSearch("Tolong telusuri di web berita gempa"), true);
  assert.equal(needsWebSearch("Cek di internet harga beras hari ini"), true);
});

test("pertanyaan time-sensitive yang lama tetap memicu search", () => {
  assert.equal(
    needsWebSearch("Apa berita terbaru tentang pemanfaatan hutan di Indonesia?"),
    true,
  );
  assert.equal(needsWebSearch("Siapa presiden Indonesia saat ini?"), true);
});

test("percakapan biasa tidak ikut terpicu", () => {
  assert.equal(needsWebSearch("Jelaskan fotosintesis"), false);
  assert.equal(needsWebSearch("Ringkas dokumen ini"), false);
  assert.equal(needsWebSearch("Siapa nama saya?"), false);
  assert.equal(needsWebSearch("Cari catatan saya tentang fiqh"), false);
  assert.equal(needsWebSearch("Simpan ini ke Google Drive"), false);
  assert.equal(needsWebSearch("Buka website Muhammadiyah Hub"), false);
});
