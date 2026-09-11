import assert from "node:assert/strict";
import test from "node:test";

function isProviderEngineEnv(name) {
  if (name === "OPENAI_API_KEY_EMBED" || name === "OPENAI_EMBED_MODEL") {
    return false;
  }

  return /^(OPENAI|GEMINI|ANTHROPIC)_/.test(name);
}

function snapshotProviderEnv() {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => isProviderEngineEnv(name)),
  );
}

function clearProviderEnv() {
  for (const name of Object.keys(process.env)) {
    if (isProviderEngineEnv(name)) {
      delete process.env[name];
    }
  }
}

function restoreProviderEnv(snapshot) {
  clearProviderEnv();
  Object.assign(process.env, snapshot);
}

const {
  isEngineConfigured,
  isProviderEngineConfigured,
  listConfiguredEngineModels,
  resolveEngineApiKey,
  resolveEngineModelId,
} = await import("./model-env.ts");

test("kunci slot Prism membuka GPT-5.6 Luna, bukan GPT-6 Astra", () => {
  const previous = snapshotProviderEnv();
  clearProviderEnv();
  process.env.OPENAI_API_KEY_PRISM = "sk-prism-test";

  try {
    assert.equal(isEngineConfigured("openai", "openai:gpt-5.6-luna"), true);
    assert.equal(
      resolveEngineApiKey("openai", "openai:gpt-5.6-luna"),
      "sk-prism-test",
    );
    assert.equal(isEngineConfigured("openai", "openai:gpt-6-astra"), false);
    assert.equal(isProviderEngineConfigured("openai"), true);
    assert.ok(listConfiguredEngineModels().includes("openai:gpt-5.6-luna"));
    assert.equal(
      listConfiguredEngineModels().includes("openai:gpt-6-astra"),
      false,
    );
  } finally {
    restoreProviderEnv(previous);
  }
});

test("kunci slot Aether membuka GPT-6 Astra lewat legacySlot katalog", () => {
  const previous = snapshotProviderEnv();
  clearProviderEnv();
  process.env.OPENAI_API_KEY_AETHER = "sk-aether-test";

  try {
    assert.equal(isEngineConfigured("openai", "openai:gpt-6-astra"), true);
    assert.equal(
      resolveEngineApiKey("openai", "openai:gpt-6-astra"),
      "sk-aether-test",
    );
    assert.equal(isEngineConfigured("openai", "openai:gpt-5.6-sol"), true);
    assert.equal(isProviderEngineConfigured("openai"), true);
    assert.ok(listConfiguredEngineModels().includes("openai:gpt-6-astra"));
  } finally {
    restoreProviderEnv(previous);
  }
});

test("kunci bersama OpenAI membuka seluruh model GPT tanpa env per model", () => {
  const previous = snapshotProviderEnv();
  clearProviderEnv();
  process.env.OPENAI_API_KEY = "sk-shared-test";

  try {
    assert.equal(isProviderEngineConfigured("openai"), true);
    assert.equal(
      resolveEngineApiKey("openai", "openai:gpt-6-astra"),
      "sk-shared-test",
    );
    assert.equal(
      resolveEngineModelId("openai", "openai:gpt-6-astra"),
      "gpt-6-astra",
    );
    assert.equal(
      resolveEngineModelId("openai", "openai:gpt-5.6-luna"),
      "gpt-5.6-luna",
    );
    assert.ok(listConfiguredEngineModels().includes("openai:gpt-6-astra"));
    assert.ok(listConfiguredEngineModels().includes("openai:gpt-5.6-luna"));
  } finally {
    restoreProviderEnv(previous);
  }
});

test("OPENAI_MODEL bersama tidak menimpa id native GPT-6 Astra", () => {
  const previous = snapshotProviderEnv();
  clearProviderEnv();
  process.env.OPENAI_API_KEY = "sk-shared-test";
  process.env.OPENAI_MODEL = "gpt-5.6-terra";

  try {
    assert.equal(
      resolveEngineModelId("openai", "openai:gpt-6-astra"),
      "gpt-6-astra",
    );
    assert.equal(
      resolveEngineModelId("openai", "openai:gpt-5.6-luna"),
      "gpt-5.6-terra",
    );
  } finally {
    restoreProviderEnv(previous);
  }
});

test("tanpa kunci OpenAI, GPT tidak ditawarkan di mode platform", () => {
  const previous = snapshotProviderEnv();
  clearProviderEnv();

  try {
    assert.equal(isProviderEngineConfigured("openai"), false);
    assert.equal(isEngineConfigured("openai", "openai:gpt-5.6-luna"), false);
    assert.equal(listConfiguredEngineModels().some((id) => id.startsWith("openai:")), false);
  } finally {
    restoreProviderEnv(previous);
  }
});
