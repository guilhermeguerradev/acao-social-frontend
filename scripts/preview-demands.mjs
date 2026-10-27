import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import process from "node:process";
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { fileURLToPath, URL } from "node:url";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
const { WebSocket, setTimeout, console, fetch } = globalThis;
if (!process.env.DEMO_PASSWORD) throw new Error('Defina DEMO_PASSWORD para a conta local de demonstracao. Nao existe senha padrao.');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const artifacts = path.join(root, ".artifacts");
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "acao-social-preview-"));
const executable = process.env.CHROME_PATH || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
await fs.mkdir(artifacts, { recursive: true });
const browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", "--remote-debugging-address=127.0.0.1", "--user-data-dir=" + profile, "about:blank"], { windowsHide: true, stdio: "ignore" });
let socket;
let createdDemandId;
const testDescription = "[DEMO VISUAL " + randomUUID() + "] Preciso de orientação sobre as atividades do projeto.";
let messageId = 0;
const pending = new Map();
async function waitFor(check, description) {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { const result = await check(); if (result) return result; } catch { /* Startup may still be in progress. */ }
    await pause(150);
  }
  throw new Error("Tempo esgotado: " + description);
}
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++messageId;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function click(label) {
  const clicked = await evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)});if(!button)return false;button.click();return true})()`);
  if (!clicked) throw new Error("Botão não encontrado: " + label);
  await pause(350);
}
async function screenshot(name) {
  const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
  await fs.writeFile(path.join(artifacts, name + ".png"), Buffer.from(result.data, "base64"));
  console.log("Captura: " + name + ".png");
}
async function cleanupCreatedDemand() {
  if (!createdDemandId) return;
  const backend = path.resolve(root, '../acao-social-backend');
  const require = createRequire(path.join(backend, 'package.json'));
  require('dotenv').config({ path: path.join(backend, '.env'), quiet: true });
  const target = new URL(process.env.DATABASE_URL);
  if (!['localhost', '127.0.0.1'].includes(target.hostname) || target.pathname !== '/acao_social' || process.env.NODE_ENV === 'production') throw new Error('Limpeza permitida somente no banco local de teste');
  const { Client } = require('pg');
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const record = await db.query('SELECT "phone", "urgent", "category", "contactConsentAt", "contactConsentVersion", "contactConsentText" FROM "Demand" WHERE id=$1 AND description=$2', [createdDemandId, testDescription]);
    const valid = record.rowCount === 1 && record.rows[0].phone === '11900000042' && record.rows[0].category === 'OTHER' && record.rows[0].urgent === true && record.rows[0].contactConsentAt && record.rows[0].contactConsentVersion === 'contact-v1' && record.rows[0].contactConsentText;
    const result = await db.query('DELETE FROM "Demand" WHERE id=$1 AND description=$2', [createdDemandId, testDescription]);
    console.log('Registros de teste removidos: ' + result.rowCount);
    if (!valid) throw new Error('Persistência real dos dados ou consentimento incorreta');
  } finally { await db.end(); }
}
try {
  const port = await waitFor(async () => (await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0], "início do navegador");
  const tabs = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(tabs.find(tab => tab.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  socket.addEventListener("message", event => {
    const message = JSON.parse(event.data);
    const item = pending.get(message.id);
    if (item) { pending.delete(message.id); if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result); }
  });
  await command("Page.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1366, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: "http://localhost:5173" });
  await waitFor(() => evaluate("document.readyState === 'complete'"), "carregamento do frontend");
  const login = await evaluate(`(async()=>{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'medico.demo@example.test',password:${JSON.stringify(process.env.DEMO_PASSWORD)}})});if(!r.ok)throw Error('Login de demonstração falhou');const session=await r.json();localStorage.setItem('acao-social:token',session.token);localStorage.setItem('acao-social:user',JSON.stringify(session.user));return true})()`);
  if (!login) throw new Error("Falha na autenticação");
  await command("Page.reload");
  await waitFor(() => evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Solicitar apoio')"), "sessão autenticada");
  await click("Solicitar apoio");
  await waitFor(() => evaluate("Boolean(document.querySelector('#demand-phone'))"), "opções e formulário");
  if (!await evaluate("document.querySelector('#demand-name').readOnly && !document.querySelector('#demand-consent').checked && ['#demand-category','#demand-return','#demand-urgent'].every(id=>document.querySelector(id).value==='')")) throw new Error("Seleções iniciais ou nome editável incorretos");
  await screenshot("demanda-registro-desktop");
  for (const [selector, value, kind] of [
    ['#demand-phone', '+55 (11) 90000-0042', 'input'],
    ['#demand-neighborhood', 'Jardim Esperança', 'input'],
    ['#demand-return', 'WHATSAPP', 'select'],
    ['#demand-category', 'OTHER', 'select'],
    ['#demand-urgent', 'true', 'select'],
  ]) {
    await evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(${kind === 'select' ? 'HTMLSelectElement' : 'HTMLInputElement'}.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('${kind === 'select' ? 'change' : 'input'}',{bubbles:true}));})()`);
    await pause(75);
  }
  await waitFor(() => evaluate("Boolean(document.querySelector('#demand-other'))"), "campo Outros obrigatório");
  await evaluate("(()=>{const el=document.querySelector('#demand-other');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Orientação sobre atividades');el.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await pause(75);
  await evaluate(`(()=>{const el=document.querySelector('#demand-description');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(testDescription)});el.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await pause(75);
  await evaluate("document.querySelector('#demand-consent').click()");
  await click("Revisar solicitação");
  await waitFor(() => evaluate("document.body.innerText.includes('Revisão de demanda')"), "revisão");
  await screenshot("demanda-revisao-desktop");
  await click("Voltar e editar");
  if (!await evaluate("document.querySelector('#demand-description').value.includes('[DEMO VISUAL') && document.querySelector('#demand-phone').value.includes('90000-0042') && document.querySelector('#demand-other').value==='Orientação sobre atividades' && document.querySelector('#demand-consent').checked")) throw new Error("Os dados não foram preservados");
  if (process.env.DEMAND_VISUAL_SUBMIT === '1') {
    await click('Revisar solicitação');
    await click('Confirmar envio');
    await waitFor(() => evaluate("document.body.innerText.includes('Solicitação enviada')"), 'confirmação após persistência');
    createdDemandId = await evaluate("document.body.innerText.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i)?.[0]");
    if (!createdDemandId) throw new Error('Identificação da demanda confirmada não encontrada');
    await screenshot('demanda-confirmacao-desktop');
    await click('Nova solicitação');
    if (!await evaluate("!document.querySelector('#demand-consent').checked && ['#demand-category','#demand-return','#demand-urgent'].every(id=>document.querySelector(id).value==='')")) throw new Error('Nova solicitação não foi reiniciada');
  }
  await click("Demandas");
  await waitFor(() => evaluate("document.body.innerText.includes('Ver detalhes')"), "listagem de demandas");
  await screenshot("demanda-gestao-desktop");
  await evaluate("(()=>{const el=document.querySelector('#demand-search');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'[DEMO 001]');el.dispatchEvent(new Event('input',{bubbles:true}));})()");
  await waitFor(() => evaluate("document.body.innerText.includes('[DEMO 001]') && !document.body.innerText.includes('[DEMO 002]') && !document.body.innerText.includes('Carregando demandas')"), "busca de demandas no servidor");
  await screenshot("demanda-busca-desktop");
  await click("Limpar busca");
  await waitFor(() => evaluate("document.body.innerText.includes('Ver detalhes') && !document.body.innerText.includes('Carregando demandas')"), "limpeza da busca");
  await click("Ver detalhes");
  await waitFor(() => evaluate("document.body.innerText.includes('Recebida em')"), "detalhes da demanda");
  await screenshot("demanda-detalhes-desktop");
  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await click("Solicitar apoio");
  await screenshot("demanda-registro-mobile");
  if (await evaluate("document.documentElement.scrollWidth > window.innerWidth")) throw new Error("Overflow horizontal em tela móvel");
  console.log(process.env.DEMAND_VISUAL_SUBMIT === '1' ? "Fluxo completo com envio verificado; o registro de teste será removido." : "Fluxos de leitura e revisão verificados. Nenhuma demanda foi enviada ou alterada.");
} catch (error) {
  if (socket?.readyState === WebSocket.OPEN) {
    console.error(await evaluate("[...document.querySelectorAll('[role=alert]')].map(el=>el.textContent).join(' | ')").catch(() => ""));
    await screenshot("demanda-erro").catch(() => {});
  }
  throw error;
} finally {
  try { await cleanupCreatedDemand(); } catch (error) { console.error(error.message); process.exitCode = 1; }
  if (socket?.readyState === WebSocket.OPEN) { await command("Browser.close").catch(() => {}); socket.close(); }
  if (browser.exitCode === null) browser.kill();
  // The temporary profile is uniquely created for this run and never points to the user's profile.
  const resolved = path.resolve(profile);
  if (resolved.startsWith(path.resolve(os.tmpdir()) + path.sep + "acao-social-preview-")) {
    await fs.rm(resolved, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }).catch(() => {});
  }
}
