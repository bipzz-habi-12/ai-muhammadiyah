// Dijalankan dengan test runner bawaan Node (`npm test`). Sengaja `.mjs` +
// tanpa framework: repo ini menghindari dependensi baru, dan Node 24 sudah bisa
// memuat `embedding.ts` langsung lewat type stripping.
//
// Fokusnya satu invarian: hasil `createEmbeddings` SELALU sejajar indeks dengan
// `texts` yang masuk. Kalau invarian ini pecah, tidak ada error yang dilempar —
// potongan catatan hanya tersimpan dengan vektor milik potongan lain, dan
// `search_notes` diam-diam salah. Jadi harus dikunci tes.
import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";

// Kunci HARUS dipasang sebelum impor: `embedding.ts` membaca process.env sekali
// saat modul dimuat. Nilainya tidak pernah dipakai — fetch di-stub.
process.env.OPENAI_API_KEY_EMBED = "test-key-tidak-pernah-dipakai";

const { createEmbedding, createEmbeddings, embeddingDimensions } = await import(
  "./embedding.ts"
);

const realFetch = globalThis.fetch;

/** Nomor penanda stabil untuk satu teks, supaya vektor bisa dilacak asalnya. */
function markerFor(text) {
  let sum = 0;

  for (const char of text) {
    sum += char.codePointAt(0);
  }

  return sum;
}

/** Vektor berdimensi benar yang seluruh elemennya penanda milik satu teks. */
function vectorFor(text) {
  return new Array(embeddingDimensions).fill(markerFor(text));
}

/** Balasan normal: satu baris per input, urut, dimensi benar. */
function rowsInOrder(input) {
  return input.map((text, index) => ({ index, embedding: vectorFor(text) }));
}

let sentInput = null;
let fetchCalls = 0;

/** Memasang fetch palsu dan merekam apa yang benar-benar dikirim ke API. */
function stubFetch(buildRows = rowsInOrder) {
  globalThis.fetch = async (_url, init) => {
    fetchCalls += 1;
    sentInput = JSON.parse(init.body).input;

    return new Response(JSON.stringify({ data: buildRows(sentInput) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}

beforeEach(() => {
  sentInput = null;
  fetchCalls = 0;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

test("potongan kosong mengisi posisinya dengan null, bukan menggeser tetangganya", async () => {
  stubFetch();

  // Ini bug aslinya: sebelum perbaikan, "gamma" menerima vektor milik "alpha".
  const texts = ["alpha", "   \n\t  ", "gamma"];
  const result = await createEmbeddings(texts);

  assert.ok(result);
  assert.equal(result.length, texts.length);
  assert.deepEqual(result[0], vectorFor("alpha"));
  assert.equal(result[1], null);
  assert.deepEqual(result[2], vectorFor("gamma"));

  // Yang kosong tetap tidak dikirim ke API — hanya posisinya yang dipertahankan.
  assert.deepEqual(sentInput, ["alpha", "gamma"]);
});

test("kosong di awal dan akhir tidak menggeser isi di tengah", async () => {
  stubFetch();

  // " " (non-breaking space) ikut kena `\s` di normalizeForEmbedding.
  const texts = ["   ", "isi", " "];
  const result = await createEmbeddings(texts);

  assert.ok(result);
  assert.deepEqual(result, [null, vectorFor("isi"), null]);
  assert.deepEqual(sentInput, ["isi"]);
});

test("balasan API yang tidak urut tetap dipetakan lewat row.index", async () => {
  stubFetch((input) => rowsInOrder(input).reverse());

  const result = await createEmbeddings(["satu", "  ", "dua", "tiga"]);

  assert.ok(result);
  assert.deepEqual(result, [
    vectorFor("satu"),
    null,
    vectorFor("dua"),
    vectorFor("tiga"),
  ]);
});

test("teks dinormalisasi dulu, dan hasilnya tetap di posisi aslinya", async () => {
  stubFetch();

  const result = await createEmbeddings(["  spasi   ganda  ", "\n"]);

  assert.ok(result);
  assert.deepEqual(sentInput, ["spasi ganda"]);
  assert.deepEqual(result, [vectorFor("spasi ganda"), null]);
});

test("semua teks kosong mengembalikan null tanpa memanggil API", async () => {
  stubFetch();

  assert.equal(await createEmbeddings(["", "   ", "\n"]), null);
  assert.equal(await createEmbeddings([]), null);
  assert.equal(fetchCalls, 0);
});

test("satu vektor berdimensi salah membatalkan seluruh batch", async () => {
  // Penjaga ini pernah bocor: `new Array(n)` itu sparse dan `every` melewati
  // lubangnya, jadi batch cacat lolos sebagai array berisi undefined.
  stubFetch((input) =>
    rowsInOrder(input).map((row, index) =>
      index === 0 ? { ...row, embedding: [1, 2, 3] } : row,
    ),
  );

  assert.equal(await createEmbeddings(["alpha", "beta"]), null);
});

test("jumlah balasan yang tidak cocok dilempar sebagai error", async () => {
  stubFetch(() => []);

  await assert.rejects(
    () => createEmbeddings(["alpha"]),
    /Embedding count mismatch/,
  );
});

test("createEmbedding tetap mengembalikan satu vektor atau null", async () => {
  stubFetch();

  assert.deepEqual(await createEmbedding("halo"), vectorFor("halo"));
  assert.equal(await createEmbedding("   "), null);
});
