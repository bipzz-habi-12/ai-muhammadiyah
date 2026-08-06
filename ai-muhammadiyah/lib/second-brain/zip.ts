// Penulis ZIP minimal untuk ekspor graf Logseq.
//
// Kenapa ditulis tangan alih-alih menambah dependensi: ekspor ini hanya butuh
// entri "stored" (tanpa kompresi), yaitu bagian paling sederhana dari format
// ZIP — sementara pustaka zip penuh membawa deflate, streaming, enkripsi, dan
// pembacaan yang semuanya tidak dipakai di sini. Berkas markdown juga kecil.
// Hasilnya diverifikasi dengan membongkar arsipnya memakai Windows Explorer
// (`Expand-Archive`), bukan hanya dengan pembacanya sendiri.
//
// Spesifikasi: APPNOTE.TXT PKWARE, metode 0 (stored), tanpa Zip64 — cukup
// selama total arsip di bawah 4GB, dan ekspor catatan tidak akan mendekatinya.

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let index = 0; index < 256; index += 1) {
    let value = index;

    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[index] = value >>> 0;
  }

  return table;
})();

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

/** Waktu/tanggal MS-DOS, satuan detiknya kelipatan dua. */
function dosDateTime(date: Date) {
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    (Math.floor(date.getSeconds() / 2) & 0x1f);
  const day =
    ((Math.max(1980, date.getFullYear()) - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();

  return { time, day };
}

type ZipEntry = { name: string; data: string };

export function createZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const now = dosDateTime(new Date());
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const dataBytes = encoder.encode(entry.data);
    const checksum = crc32(dataBytes);

    const localHeader = new DataView(new ArrayBuffer(30));
    localHeader.setUint32(0, 0x04034b50, true); // tanda tangan
    localHeader.setUint16(4, 20, true); // versi minimum
    localHeader.setUint16(6, 0x0800, true); // bendera: nama berkas UTF-8
    localHeader.setUint16(8, 0, true); // metode: stored
    localHeader.setUint16(10, now.time, true);
    localHeader.setUint16(12, now.day, true);
    localHeader.setUint32(14, checksum, true);
    localHeader.setUint32(18, dataBytes.length, true); // ukuran terkompresi
    localHeader.setUint32(22, dataBytes.length, true); // ukuran asli
    localHeader.setUint16(26, nameBytes.length, true);
    localHeader.setUint16(28, 0, true); // panjang extra

    localParts.push(new Uint8Array(localHeader.buffer), nameBytes, dataBytes);

    const centralHeader = new DataView(new ArrayBuffer(46));
    centralHeader.setUint32(0, 0x02014b50, true);
    centralHeader.setUint16(4, 20, true); // versi pembuat
    centralHeader.setUint16(6, 20, true); // versi minimum
    centralHeader.setUint16(8, 0x0800, true);
    centralHeader.setUint16(10, 0, true);
    centralHeader.setUint16(12, now.time, true);
    centralHeader.setUint16(14, now.day, true);
    centralHeader.setUint32(16, checksum, true);
    centralHeader.setUint32(20, dataBytes.length, true);
    centralHeader.setUint32(24, dataBytes.length, true);
    centralHeader.setUint16(28, nameBytes.length, true);
    centralHeader.setUint16(30, 0, true); // extra
    centralHeader.setUint16(32, 0, true); // komentar
    centralHeader.setUint16(34, 0, true); // nomor disk
    centralHeader.setUint16(36, 0, true); // atribut internal
    centralHeader.setUint32(38, 0, true); // atribut eksternal
    centralHeader.setUint32(42, offset, true); // posisi local header

    centralParts.push(new Uint8Array(centralHeader.buffer), nameBytes);

    offset += 30 + nameBytes.length + dataBytes.length;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);

  const endRecord = new DataView(new ArrayBuffer(22));
  endRecord.setUint32(0, 0x06054b50, true);
  endRecord.setUint16(4, 0, true); // nomor disk ini
  endRecord.setUint16(6, 0, true); // disk awal direktori pusat
  endRecord.setUint16(8, entries.length, true);
  endRecord.setUint16(10, entries.length, true);
  endRecord.setUint32(12, centralSize, true);
  endRecord.setUint32(16, offset, true);
  endRecord.setUint16(20, 0, true); // panjang komentar

  const allParts = [
    ...localParts,
    ...centralParts,
    new Uint8Array(endRecord.buffer),
  ];
  const totalLength = allParts.reduce((sum, part) => sum + part.length, 0);
  const archive = new Uint8Array(totalLength);
  let position = 0;

  for (const part of allParts) {
    archive.set(part, position);
    position += part.length;
  }

  return archive;
}
