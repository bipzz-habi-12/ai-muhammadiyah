import assert from "node:assert/strict";
import test from "node:test";

const { coerceOptionalUuid, parseNoteBlocks } = await import("./parse.ts");

test("workspaceId dan conversationId kosong tidak dianggap UUID", () => {
  assert.equal(coerceOptionalUuid(""), null);
  assert.equal(coerceOptionalUuid("   "), null);
  assert.equal(coerceOptionalUuid("general"), null);
  assert.equal(coerceOptionalUuid(null), null);
  assert.equal(
    coerceOptionalUuid("2f1a0c3e-4b5d-6789-abcd-ef0123456789"),
    "2f1a0c3e-4b5d-6789-abcd-ef0123456789",
  );
});

test("usulan catatan speaking test tetap ter-parse", () => {
  const text = `[[AI_MU_NOTE:Strategi Menghadapi Speaking Test]]
Kunci ketenangan saat uji bicara ("speaking test").
[[/AI_MU_NOTE]]`;

  const drafts = parseNoteBlocks(text);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0].title, "Strategi Menghadapi Speaking Test");
});
