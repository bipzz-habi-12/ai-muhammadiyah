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
