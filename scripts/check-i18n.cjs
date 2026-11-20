/* eslint-disable @typescript-eslint/no-require-imports -- This is a Node CommonJS test runner. */
// Dependency-free regression checks for language selection and English output.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const root = path.resolve(__dirname, "..");
const modules = new Map();
const storage = new Map();
const document = { cookie: "" };
const window = { localStorage: { setItem: (key, value) => storage.set(key, value) } };
const navigator = { get language() { throw Error("Browser language must never be inspected"); } };

function load(file) {
  file = path.resolve(root, file);
  if (modules.has(file)) return modules.get(file).exports;
  // The analyst only needs this constant; no market network requests in unit checks.
  if (file.endsWith("asia-markets.ts")) return { ASIA_CURRENCY: {} };
  const compiledModule = { exports: {} };
  modules.set(file, compiledModule);
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const localRequire = id => {
    if (!id.startsWith(".") && !id.startsWith("@/")) return require(id);
    const base = id.startsWith("@/") ? path.resolve(root, id.slice(2)) : path.resolve(path.dirname(file), id);
    return load([".ts", ".tsx"].map(ext => base + ext).find(fs.existsSync));
  };
  vm.runInNewContext(code, { exports: compiledModule.exports, module: compiledModule, require: localRequire, window, document, navigator }, { filename: file });
  return compiledModule.exports;
}

const { resolveClientLang, setLangCookie, LANG_STORAGE_KEY } = load("lib/lang-pref.ts");
assert.equal(resolveClientLang(), "en");
document.cookie = "unrelated=value";
assert.equal(resolveClientLang(), "en");
setLangCookie("zh");
assert.equal(resolveClientLang(), "zh");
assert.equal(storage.get(LANG_STORAGE_KEY), "zh");
setLangCookie("en");
assert.equal(resolveClientLang(), "en");
assert.equal(storage.get(LANG_STORAGE_KEY), "en");

const { dict } = load("lib/i18n.ts");
const { containsCjk, localizedName, localizedError } = load("lib/localized-text.ts");
function checkEnglish(value, key = "en") {
  if (typeof value === "string") assert(!containsCjk(value), `CJK in dictionary: ${key}`);
  else if (value && typeof value === "object") for (const [name, next] of Object.entries(value)) checkEnglish(next, `${key}.${name}`);
}
checkEnglish(dict.en);
assert(containsCjk(dict.zh.nav.overview));
assert.equal(localizedName({ name: "苹果", nameEn: "Apple", symbol: "AAPL" }, "en"), "Apple");
assert.equal(localizedName({ name: "苹果", symbol: "AAPL" }, "en"), "AAPL");
assert.equal(localizedError("请先登录", "en", "Please sign in."), "Please sign in.");

const { localAnalyze, buildMarketContext } = load("lib/agent-context.ts");
const quote = { symbol: "INX", code: "INX", name: "标普500", nameEn: "S&P 500", price: 6000, change: 1, changePct: 0.1, open: 6000, high: 6001, low: 5999, prevClose: 5999, pe: 20, valuation: { pe: 20, pb: 3, pePercentile: 0.5 }, tech: { ma5: 6000, ma10: 6000, ma20: 6000, rsi14: 75, macd: 1, macdCross: "golden" } };
const snapshot = { indices: [quote], stocks: [quote] };
const bundle = { us: snapshot, cn: snapshot, asia: snapshot };
assert(!containsCjk(buildMarketContext(bundle, "en")));
for (const question of ["INX", "overview", "valuation", "RSI", "portfolio", "buy", "help"]) {
  assert(!containsCjk(localAnalyze(bundle, question, "en")), `CJK in local analyst: ${question}`);
}
assert(containsCjk(localAnalyze(bundle, "overview", "zh")));
const { buildSystemPrompt } = load("lib/chat.ts");
assert(!containsCjk(buildSystemPrompt("en", { mode: "chat" })));
assert(!containsCjk(buildSystemPrompt("en", { mode: "diagnosis" })));

const { PLANS_CONFIG, getPlanFeatures, getBillingCopy } = load("config/plans.ts");
for (const id of ["free", "pro"]) {
  assert(!containsCjk(getPlanFeatures(id, "en").join(" ")));
  assert.equal(getPlanFeatures(id).length, PLANS_CONFIG.comparison.length);
}
assert.equal(getBillingCopy("pro", "monthly").price, "$9.90");
assert.equal(PLANS_CONFIG.free.limits.aiQuestionsPerDay, 5);
assert.equal(PLANS_CONFIG.pro.limits.aiQuestionsPerDay, 200);
console.log("PASS: English defaults, explicit persisted toggles, all English dictionary strings, market names, upstream errors, local AI replies, AI prompts and plan copy.");
