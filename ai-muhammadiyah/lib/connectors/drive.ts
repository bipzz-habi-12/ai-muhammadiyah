// Klien Google Drive — SERVER ONLY. Semua operasi memakai access token
// pengguna, jadi Drive sendiri yang menegakkan izinnya.
//
// Ingat batas scope drive.file: aplikasi ini HANYA bisa melihat dan mengubah
// berkas yang ia buat sendiri, atau yang dipilih pengguna lewat Google Picker.
// `daftarBerkas` karena itu tidak akan pernah menampilkan seluruh isi Drive —
// itu bukan bug, itu memang yang membuat scope ini bebas audit CASA.

const driveFilesEndpoint = "https://www.googleapis.com/drive/v3/files";
const driveUploadEndpoint =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  modifiedTime?: string;
};

/**
 * Buat Google Docs asli dari teks/Markdown.
 *
 * Caranya menggunakan konversi bawaan Drive: unggah sebagai text/plain lalu
 * minta mimeType tujuan Google Docs. Ini menghindari Google Docs API yang
 * jauh lebih berbelit (batchUpdate per elemen) untuk hasil yang praktis sama.
 */
export async function createGoogleDoc(
  accessToken: string,
  title: string,
  content: string,
): Promise<DriveFile | null> {
  const boundary = `magent${Date.now()}`;
  const metadata = {
    name: title,
    mimeType: "application/vnd.google-apps.document",
  };

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "",
    content,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  try {
    const response = await fetch(
      `${driveUploadEndpoint}&fields=id,name,mimeType,webViewLink`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      },
    );

    if (!response.ok) {
      console.error("Drive createGoogleDoc failed:", {
        status: response.status,
        detail: (await response.text()).slice(0, 300),
      });
      return null;
    }

    return (await response.json()) as DriveFile;
  } catch (error) {
    console.error("Drive createGoogleDoc threw:", error);
    return null;
  }
}

/** Berkas yang bisa dijangkau aplikasi ini (lihat catatan scope di atas). */
export async function listAccessibleFiles(
  accessToken: string,
  query?: string,
): Promise<DriveFile[]> {
  const params = new URLSearchParams({
    pageSize: "20",
    fields: "files(id,name,mimeType,webViewLink,modifiedTime)",
    orderBy: "modifiedTime desc",
    // trashed=false: berkas di tempat sampah masih terjangkau API dan akan
    // membingungkan kalau ikut muncul.
    q: query
      ? `trashed = false and name contains '${query.replace(/'/g, "\\'")}'`
      : "trashed = false",
  });

  try {
    const response = await fetch(`${driveFilesEndpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      console.error("Drive listAccessibleFiles failed:", {
        status: response.status,
      });
      return [];
    }

    const data = (await response.json()) as { files?: DriveFile[] };
    return data.files ?? [];
  } catch (error) {
    console.error("Drive listAccessibleFiles threw:", error);
    return [];
  }
}

const maxDriveFileCharacters = 12_000;

/**
 * Baca isi berkas sebagai teks. Google Docs/Sheets/Slides diekspor lebih dulu
 * (format aslinya bukan teks); berkas biasa diunduh langsung.
 */
export async function readDriveFileText(
  accessToken: string,
  fileId: string,
): Promise<{ name: string; text: string } | null> {
  try {
    const metaResponse = await fetch(
      `${driveFilesEndpoint}/${encodeURIComponent(fileId)}?fields=id,name,mimeType`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!metaResponse.ok) {
      return null;
    }

    const meta = (await metaResponse.json()) as DriveFile;
    const isGoogleNative = meta.mimeType?.startsWith(
      "application/vnd.google-apps",
    );

    const exportMimeType =
      meta.mimeType === "application/vnd.google-apps.spreadsheet"
        ? "text/csv"
        : "text/plain";

    const contentUrl = isGoogleNative
      ? `${driveFilesEndpoint}/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportMimeType)}`
      : `${driveFilesEndpoint}/${encodeURIComponent(fileId)}?alt=media`;

    const contentResponse = await fetch(contentUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!contentResponse.ok) {
      console.error("Drive readDriveFileText content failed:", {
        status: contentResponse.status,
        mimeType: meta.mimeType,
      });
      return null;
    }

    const text = await contentResponse.text();

    return {
      name: meta.name,
      text:
        text.length > maxDriveFileCharacters
          ? `${text.slice(0, maxDriveFileCharacters)}\n\n[dipotong — berkas lebih panjang dari batas konteks]`
          : text,
    };
  } catch (error) {
    console.error("Drive readDriveFileText threw:", error);
    return null;
  }
}
