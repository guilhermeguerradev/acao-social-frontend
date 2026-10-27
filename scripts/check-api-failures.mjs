import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
const { WebSocket, fetch, setTimeout, console } = globalThis;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origin = "http://127.0.0.1:15174";
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "acao-social-api-errors-"));
const vite = spawn(process.execPath, [path.join(root, "node_modules/vite/bin/vite.js"), "--host", "127.0.0.1", "--port", "15174", "--strictPort"], { cwd: root, env: { ...process.env, VITE_API_URL: "/api" }, windowsHide: true, stdio: "ignore" });
const browser = spawn(process.env.CHROME_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
const pending = new Map();
const exceptions = [];
let socket, id = 0, mode = "ok", apiRequests = 0;
const options = { categories: [{ value: "FOOD", label: "Alimentos ou cesta básica" }], returnPreferences: [{ value: "WHATSAPP", label: "WhatsApp" }, { value: "PHONE_CALL", label: "Ligação telefônica" }], consent: { version: "contact-v1", text: "Autorizo o uso dos dados informados para análise e contato sobre esta solicitação." } };
function command(method, params = {}) {
  return new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error("Falha na avaliacao do navegador: " + (result.exceptionDetails.exception?.description ?? result.exceptionDetails.text).slice(0, 500));
  return result.result.value;
}
async function waitFor(check, label) {
  for (let attempt = 0; attempt < 100; attempt++) { try { if (await check()) return; } catch { /* Startup and renders are asynchronous. */ } await pause(100); }
  throw new Error("Tempo esgotado: " + label);
}
async function click(label) {
  assert.equal(await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button)return false;button.click();return true})()`), true, label);
  await pause(400);
}
async function fulfill(event) {
  // Every API call is answered here. No request reaches a backend or database.
  apiRequests++;
  const url = new URL(event.request.url);
  assert.equal(url.origin, origin);
  assert.equal(event.request.method, "GET");
  const status = /^\d+$/.test(mode) ? Number(mode) : 200;
  let body;
  if (status !== 200) body = { error: "Erro de teste " + status };
  else if (url.pathname === "/api/demandas/options") body = mode === "bad-options" ? {} : options;
  else if (["/api/medicos", "/api/instrutores", "/api/users"].includes(url.pathname)) body = [];
  else if (mode === "bad-page") body = [];
  else if (mode === "bad-row") body = { data: [{ id: "invalid-row" }], page: 1, limit: 20, total: 1, totalPages: 1 };
  else body = { data: [], page: 1, limit: 20, total: 0, totalPages: 0 };
  await command("Fetch.fulfillRequest", { requestId: event.requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(body)).toString("base64") });
}
async function authenticatedPage() {
  await evaluate(`localStorage.setItem('acao-social:token','browser-test-token');localStorage.setItem('acao-social:user',JSON.stringify({id:'browser-user',name:'[TESTE] Conta',email:'test@example.test',role:'MEDICO'}))`);
  await command("Page.reload");
}
try {
  await waitFor(async () => (await fetch(origin)).ok, "Vite local");
  await waitFor(async () => Boolean(await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")), "Edge");
  const port = (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0];
  const tabs = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    if (message.id) { const item = pending.get(message.id); if (item) { pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); } }
    if (message.method === "Fetch.requestPaused") fulfill(message.params).catch(error => { exceptions.push(error.message); command("Fetch.failRequest", { requestId: message.params.requestId, errorReason: "BlockedByClient" }).catch(() => {}); });
    if (message.method === "Runtime.exceptionThrown") exceptions.push("Excecao nao tratada no navegador");
  });
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Fetch.enable", { patterns: [{ urlPattern: origin + "/api/*", requestStage: "Request" }] });
  await command("Page.navigate", { url: origin });
  await waitFor(() => evaluate("document.body.innerText.includes('Acesso ao sistema')"), "login inicial");
  for (const scenario of process.env.BOUNDARY_ONLY ? [] : ["ok", "404", "500", "503", "bad-page", "bad-row", "bad-options", "401"]) {
    mode = scenario;
    await authenticatedPage();
    if (mode === "401") {
      await waitFor(() => evaluate("document.body.innerText.includes('Acesso ao sistema') && document.body.innerText.includes('Sessao expirada')"), "sessao expirada");
      assert.equal(await evaluate("localStorage.getItem('acao-social:token')===null && localStorage.getItem('acao-social:user')===null"), true);
    } else {
      const invalid = ["bad-page", "bad-row"].includes(mode);
      const expected = ["404", "500", "503"].includes(mode) ? "Erro de teste " + mode : invalid ? "Resposta invalida" : "Proximas consultas";
      await waitFor(() => evaluate(`document.body.innerText.includes(${JSON.stringify(expected)})`), "dashboard " + mode);
      for (const tab of ["Demandas", "Consultas", "Aulas", "Solicitar apoio"]) {
        await click(tab);
        const form = tab === "Solicitar apoio";
        const failure = ["404", "500", "503"].includes(mode) ? "Erro de teste " + mode : (form ? mode === "bad-options" : invalid) ? "Resposta invalida" : null;
        if (failure) await waitFor(() => evaluate(`document.body.innerText.includes(${JSON.stringify(failure)})`), tab + " erro " + mode);
        else if (form) await waitFor(() => evaluate("Boolean(document.querySelector('#demand-phone'))"), "formulario de demandas");
        else await waitFor(() => evaluate("!document.body.innerText.includes('Carregando')"), tab + " carregada");
        assert.equal(await evaluate("document.body.innerText.length>50 && !document.body.innerText.includes('Não foi possível exibir esta tela')"), true, tab + " deve tratar a resposta na origem");
      }
    }
    console.log("Aprovado no navegador: " + scenario);
  }
  assert.deepEqual(exceptions, []);
  await fs.mkdir(path.join(root, ".artifacts"), { recursive: true });
  const capture = await command("Page.captureScreenshot", { format: "png" });
  await fs.writeFile(path.join(root, ".artifacts/session-expired.png"), Buffer.from(capture.data, "base64"));
  await evaluate(`(async()=>{
    const reactModule=await import('/node_modules/.vite/deps/react.js');
    const domModule=await import('/node_modules/.vite/deps/react-dom_client.js');
    const React=reactModule.default??reactModule;
    const {createRoot}=domModule.default??domModule;
    const {RenderErrorBoundary}=await import('/src/components/RenderErrorBoundary.tsx');
    const container=document.createElement('div');container.id='boundary-test';document.body.append(container);
    function BrokenFixture(){throw new Error('Intentional render fixture');}
    createRoot(container).render(React.createElement(RenderErrorBoundary,null,React.createElement(BrokenFixture)));
  })()`);
  await waitFor(() => evaluate("document.querySelector('#boundary-test')?.innerText.includes('Não foi possível exibir esta tela')"), "protecao de renderizacao inesperada");
  console.log("Aprovado no navegador: fallback para excecao inesperada de renderizacao.");
  console.log("Requisicoes simuladas: " + apiRequests + ". Nenhum backend ou banco foi acessado.");
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await command("Browser.close").catch(() => {}); socket.close(); }
  if (browser.exitCode === null) browser.kill();
  if (vite.exitCode === null) vite.kill();
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + "acao-social-api-errors-")) await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
}
