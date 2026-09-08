import assert from "node:assert/strict";
import test from "node:test";

const {
  defaultModelId,
  getEquivalentModel,
  getModelProvider,
  isModelId,
  modelCatalog,
  modelOptions,
  normalizeCredentialMode,
} = await import("./model-catalog.ts");

test("semua ID katalog memakai provider dan ID API yang cocok", () => {
  assert.ok(modelOptions.length >= 9);

  for (const modelId of modelOptions) {
    const definition = modelCatalog[modelId];
    assert.equal(modelId, `${definition.provider}:${definition.apiModelId}`);
    assert.equal(getModelProvider(modelId), definition.provider);
  }
});

test("nama alias lama bukan lagi model publik", () => {
  for (const legacy of ["aether", "cosmos", "prism", "velo"]) {
    assert.equal(isModelId(legacy), false);
  }

  assert.equal(isModelId(defaultModelId), true);
});

test("katalog hanya memuat model Claude yang masih aktif", () => {
  assert.equal(modelOptions.length, 43);
  assert.equal(isModelId("anthropic:claude-fable-5-1"), true);
  assert.equal(isModelId("anthropic:claude-opus-5"), true);
  assert.equal(isModelId("anthropic:claude-sonnet-5"), true);
  assert.equal(isModelId("anthropic:claude-opus-4-1-20250805"), false);
  assert.equal(isModelId("anthropic:claude-3-7-sonnet-20250219"), false);
});

test("fallback lintas provider selalu menunjuk model katalog nyata", () => {
  for (const modelId of modelOptions) {
    for (const provider of ["openai", "google", "anthropic"]) {
      const equivalent = getEquivalentModel(modelId, provider);
      assert.ok(equivalent);
      assert.equal(modelCatalog[equivalent].provider, provider);
    }
  }
});

test("mode credential hanya menerima platform atau byok", () => {
  assert.equal(normalizeCredentialMode("byok"), "byok");
  assert.equal(normalizeCredentialMode("platform"), "platform");
  assert.equal(normalizeCredentialMode("forged"), "platform");
});
