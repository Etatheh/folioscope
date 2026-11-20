/* eslint-disable @typescript-eslint/no-require-imports -- This is a Node CommonJS test runner. */
// Run against a local server: node scripts/verify-i18n.cjs http://127.0.0.1:3010
// Uses a fresh Chrome incognito context with Chinese browser locale and headers.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const origin = process.argv[2] || "http://127.0.0.1:3010";
assert(["127.0.0.1", "localhost", "[::1]"].includes(new URL(origin).hostname), "This test may only target a local server.");
require("@next/env").loadEnvConfig(path.resolve(__dirname, ".."), true, { info() {}, error() {} });
const testEmail = process.env.LOCAL_ADMIN_EMAIL;
const testPassword = process.env.LOCAL_ADMIN_PASSWORD;
const chromePath = process.env.CHROME_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const cjk = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "folioscope-i18n-"));
  const chrome = spawn(chromePath, ["--headless=new", "--incognito", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--disable-background-networking", "--lang=zh-CN", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
  let socket;
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; !fs.existsSync(portFile) && i < 100; i++) await pause(100);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
    socket = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const pending = new Map();
    const exceptions = [];
    socket.onmessage = event => {
      const msg = JSON.parse(event.data);
      if (msg.method === "Runtime.exceptionThrown") exceptions.push(msg.params.exceptionDetails.text);
      if (!msg.id) return;
      const promise = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) promise?.reject(Error(msg.error.message));
      else promise?.resolve(msg.result);
    };
    const send = (method, params = {}) => new Promise((resolve, reject) => {
      const callId = ++id;
      pending.set(callId, { resolve, reject });
      socket.send(JSON.stringify({ id: callId, method, params }));
    });
    const evaluate = async expression => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
      return result.result.value;
    };
    const until = async (expression, label) => {
      for (let i = 0; i < 240; i++) {
        if (await evaluate(expression)) return;
        await pause(250);
      }
      throw Error(`Timed out: ${label}`);
    };
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Network.enable");
    await send("Network.setExtraHTTPHeaders", { headers: { "Accept-Language": "zh-CN,zh;q=0.9" } });
    await send("Emulation.setLocaleOverride", { locale: "zh-CN" });
    const browserVersion = await send("Browser.getVersion");
    await send("Network.setUserAgentOverride", { userAgent: browserVersion.userAgent, acceptLanguage: "zh-CN,zh;q=0.9" });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const navigate = async route => {
      await send("Page.navigate", { url: origin + route });
      await until(`(location.pathname === ${JSON.stringify(route.split("?")[0])} || (${JSON.stringify(route.startsWith("/dashboard"))} && location.pathname === "/login")) && document.readyState === 'complete' && !!document.querySelector('main')`, route);
      // Allow hydration, auth/session results and streamed panels to complete.
      await until(`!!document.querySelector('button[aria-label="Switch to Chinese"], button[aria-label="切换到英文"]')`, "hydrated language toggle");
      if (route.startsWith("/dashboard")) await until(`!document.body.innerText.includes('Loading panel data') && !document.body.innerText.includes('正在加载面板数据')`, "dashboard data");
    };
    const inspect = () => evaluate(`({lang: document.documentElement.lang, text: document.body.innerText, attrs: [...document.querySelectorAll('[title],[aria-label],[placeholder]')].filter(el => el.getClientRects().length).flatMap(el => ['title','aria-label','placeholder'].map(a => el.getAttribute(a) || '')), cookie: document.cookie, stored: localStorage.getItem('folioscope.lang')})`);
    const english = async label => {
      const state = await inspect();
      assert.equal(state.lang, "en", label);
      const text = state.text + state.attrs.join(" ");
      assert(!cjk.test(text), `${label}: CJK leak: ${text.match(/.{0,35}[\p{Script=Han}].{0,35}/gu)?.join(" | ")}`);
      console.log(`PASS English: ${label}`);
    };

    assert.equal((await send("Network.getCookies", { urls: [origin] })).cookies.length, 0);
    assert((await evaluate("navigator.language")).startsWith("zh"), "Chinese browser language fixture");
    if (process.argv.includes("--locale-smoke")) {
      await navigate("/");
      await english("Chinese navigator language and headers");
      await until(`[...document.querySelectorAll("button")].some(b => b.textContent.trim() === "Log in")`, "login button");
      await evaluate(`[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Log in").click()`);
      await until(`!!document.querySelector("[role=dialog]")`, "login modal");
      await english("login modal with Chinese browser locale");
      console.log("PASS fresh incognito navigator.language=zh-CN, English page and auth modal.");
      return;
    }
    const routes = ["/", "/?lang=zh", "/dashboard", "/dashboard?view=us", "/dashboard?view=europe", "/dashboard?view=asia", "/dashboard?view=watchlist", "/dashboard?view=simulator", "/dashboard?view=ai", "/pricing", "/terms", "/privacy", "/refund", "/disclaimer", "/journey", "/login", "/register"];
    for (const route of routes) {
      await navigate(route);
      await english(route);
    }
    if (testEmail && testPassword) {
      const login = await evaluate(`fetch('/api/auth/login', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email: ${JSON.stringify(testEmail)}, password: ${JSON.stringify(testPassword)}, lang:'en'})}).then(r => ({ok:r.ok}))`);
      assert(login.ok, "Local development QA login");
      for (const route of ["/dashboard", "/dashboard?view=us", "/dashboard?view=europe", "/dashboard?view=asia", "/dashboard?view=watchlist", "/dashboard?view=simulator", "/dashboard?view=ai"]) {
        await navigate(route);
        assert.equal(await evaluate("location.pathname"), "/dashboard");
        await english("local developer session " + route);
      }
    }
    await navigate("/");
    await evaluate(`document.querySelector('button[aria-label="Switch to Chinese"]').click()`);
    await until(`document.documentElement.lang === 'zh' && !!document.querySelector('button[aria-label="切换到英文"]')`, "switch to Chinese");
    const saved = await inspect();
    assert.equal(saved.stored, "zh");
    assert(saved.cookie.includes("lang=zh"));
    for (const route of ["/", "/dashboard", "/pricing", "/terms", "/privacy", "/refund", "/disclaimer"]) {
      await navigate(route);
      const state = await inspect();
      assert.equal(state.lang, "zh");
      assert(cjk.test(state.text), `${route}: Chinese content missing`);
      console.log(`PASS Chinese + saved preference: ${route}`);
    }
    await evaluate(`document.querySelector('button[aria-label="切换到英文"]').click()`);
    await until(`document.documentElement.lang === 'en' && !!document.querySelector('button[aria-label="Switch to Chinese"]')`, "switch back to English");
    await english("return to English");
    await send("Network.deleteCookies", { name: "gui_session", url: origin });
    for (const endpoint of ["/api/auth/me", "/api/checkout", "/api/portal", "/api/auth/upgrade", "/api/billing/checkout", "/api/ai/stock-report"]) {
      const response = await evaluate(`fetch(${JSON.stringify(endpoint)}, {method: ${JSON.stringify(endpoint.includes("/me") || endpoint.includes("stock-report") ? "GET" : "POST")}}).then(r => r.json())`);
      assert(!cjk.test(JSON.stringify(response)), `${endpoint}: non-English error`);
      console.log(`PASS English API error: ${endpoint}`);
    }
    assert.deepEqual(exceptions, [], "Browser JavaScript exceptions");
    console.log("PASS all browser i18n checks (fresh incognito, Chinese locale/header, persisted toggles, API errors).");
  } finally {
    socket?.close();
    chrome.kill();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
