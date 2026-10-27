import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { randomUUID } from "node:crypto";
import { URL } from "node:url";
import * as jsx from "react/jsx-runtime";
import ts from "typescript";

// Exercise the flow's event/state transitions without introducing a DOM test dependency.
function flow(createDemand) {
  const slots = [];
  let cursor = 0;
  const callbacks = { created: 0, list: 0, back: 0 };
  const components = Object.fromEntries([
    "Button", "Card", "CardContent", "CardDescription", "CardHeader", "CardTitle", "DemandForm", "DemandSummary", "DemandDraftSummary", "Loader2",
  ].map(name => [name, function Component() { return null; }]));
  let helpers;
  const options = { categories: [{ value: "FOOD", label: "Alimentos ou cesta básica" }, { value: "OTHER", label: "Outros" }], returnPreferences: [{ value: "WHATSAPP", label: "WhatsApp" }, { value: "PHONE_CALL", label: "Ligação telefônica" }], consent: { version: "contact-v1", text: "Autorizo o uso dos dados informados para análise e contato sobre esta solicitação." } };
  const context = {
    exports: {}, window: { crypto: { randomUUID } },
    require: id => {
      if (id === "react/jsx-runtime") return jsx;
      if (id === "react") return {
        useState: initial => {
          const index = cursor++;
          if (!(index in slots)) slots[index] = typeof initial === "function" ? initial() : initial;
          return [slots[index], value => { slots[index] = typeof value === "function" ? value(slots[index]) : value; }];
        },
        useRef: initial => {
          const index = cursor++;
          if (!(index in slots)) slots[index] = { current: initial };
          return slots[index];
        },
      };
      if (id === "../../lib/api" || id === "./api") return { endpoints: { createDemand } };
      if (id === "../../lib/utils" || id === "./utils") return { normalizeApiError: error => error.error ?? error.message, formatDateTime: value => String(value ?? "") };
      if (id === "../../lib/demand-options") return helpers;
      return components;
    },
  };
  const helperContext = { ...context, exports: {} };
  const helperSource = fs.readFileSync(new URL("../src/lib/demand-options.ts", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(helperSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, helperContext);
  helpers = { ...helperContext.exports, useDemandOptions: () => ({ options, loading: false, error: "" }) };
  const source = fs.readFileSync(new URL("../src/components/demands/DemandFlow.tsx", import.meta.url), "utf8");
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText, context);
  const render = () => {
    cursor = 0;
    return context.exports.DemandFlow({
      user: { id: "owner", name: "Solicitante", role: null },
      onCreated: () => callbacks.created++, onViewDemands: () => callbacks.list++, onBack: () => callbacks.back++,
    });
  };
  return { render, components, callbacks, helpers, options };
}

function nodes(tree) {
  if (tree === null || tree === undefined || typeof tree === "boolean") return [];
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return typeof tree === "object" ? [tree, ...nodes(tree.props?.children), ...nodes(tree.props?.aside)] : [tree];
}
function text(tree) { return nodes(tree).filter(node => typeof node === "string").join(" "); }
function button(tree, label) {
  const found = nodes(tree).find(node => typeof node === "object" && text(node.props?.children).includes(label) && typeof node.props?.onClick === "function");
  assert.ok(found, "Button not found: " + label);
  return found;
}
function review(harness, description = "Apoio solicitado") {
  const entry = harness.render(); entry.props.onChange({ ...entry.props.draft, description, phone: "+55 (11) 90000-0042", neighborhood: "Jardim Esperança", returnPreference: "WHATSAPP", category: "FOOD", urgent: "false", contactConsent: true });
  harness.render().props.onContinue(); return harness.render();
}
const received = { id: "saved-demand", status: "RECEIVED", description: "Apoio solicitado", requester: { name: "Solicitante" } };

test("demand entry and review preserve text without sending anything to the backend", () => {
  let calls = 0;
  const harness = flow(async () => { calls++; return received; });
  const tree = review(harness, "Texto que será revisado");
  assert.equal(nodes(tree).find(node => node?.type === harness.components.DemandDraftSummary).props.draft.description, "Texto que será revisado"); assert.equal(calls, 0);
  button(tree, "Voltar e editar").props.onClick();
  assert.equal(harness.render().props.draft.description, "Texto que será revisado");
  assert.equal(harness.render().props.draft.neighborhood, "Jardim Esperança");
});
test("demand success appears only after persistence returns and double clicks send once", async () => {
  let finish;
  let calls = 0;
  const pending = new Promise(resolve => { finish = resolve; });
  const harness = flow(() => { calls++; return pending; });
  const tree = review(harness);
  const send = button(tree, "Confirmar envio").props.onClick;
  const first = send(); await send();
  assert.equal(calls, 1); assert.equal(harness.callbacks.created, 0);
  assert.ok(!text(harness.render()).includes("Solicitação enviada"));
  assert.equal(button(harness.render(), "Enviando...").props.disabled, true);
  finish(received); await first;
  assert.ok(text(harness.render()).includes("Solicitação enviada")); assert.equal(harness.callbacks.created, 1);
});
test("demand failures retain review data and retries reuse the same technical key", async () => {
  const payloads = [];
  const harness = flow(async payload => {
    payloads.push(payload);
    if (payloads.length === 1) throw { error: "Falha na conexão" };
    return received;
  });
  await button(review(harness), "Confirmar envio").props.onClick();
  const failed = harness.render();
  assert.ok(text(failed).includes("Falha na conexão")); assert.equal(nodes(failed).find(node => node?.type === harness.components.DemandDraftSummary).props.draft.description, "Apoio solicitado");
  assert.equal(harness.callbacks.created, 0);
  await button(failed, "Confirmar envio").props.onClick();
  assert.equal(payloads[0].requestKey, payloads[1].requestKey); assert.equal(harness.callbacks.created, 1);
});
test("demand confirmation shows the backend record and a new request gets a different key", async () => {
  const payloads = [];
  const harness = flow(async payload => { payloads.push(payload); return received; });
  await button(review(harness), "Confirmar envio").props.onClick();
  const confirmation = harness.render();
  const summary = nodes(confirmation).find(node => node?.type === harness.components.DemandSummary);
  assert.equal(summary.props.demand, received);
  assert.ok(text(confirmation).includes("não significa aprovação"));
  button(confirmation, "Consultar demandas").props.onClick(); assert.equal(harness.callbacks.list, 1);
  button(confirmation, "Nova solicitação").props.onClick(); assert.equal(harness.render().props.draft.description, "");
  assert.equal(harness.render().props.draft.contactConsent, false); assert.equal(harness.render().props.draft.urgent, "");
  await button(review(harness, "Outra solicitação"), "Confirmar envio").props.onClick();
  assert.notEqual(payloads[0].requestKey, payloads[1].requestKey);
});

test("demand forms start with no selections or consent and validate all approved fields", () => {
  const harness = flow(async () => received);
  const initial = harness.render().props.draft;
  for (const field of ["category", "returnPreference", "urgent"]) assert.equal(initial[field], "");
  assert.equal(initial.contactConsent, false);
  const valid = { ...initial, phone: "11900000042", neighborhood: "Centro", category: "FOOD", returnPreference: "WHATSAPP", urgent: "false", description: "Apoio", contactConsent: true };
  assert.equal(harness.helpers.validateDemandDraft(valid, harness.options), null);
  for (const patch of [{ phone: "invalid" }, { neighborhood: " " }, { category: "UNKNOWN" }, { returnPreference: "EMAIL" }, { urgent: "" }, { contactConsent: false }, { description: " " }, { description: "x".repeat(2001) }, { category: "OTHER", otherDescription: " " }]) {
    assert.equal(typeof harness.helpers.validateDemandDraft({ ...valid, ...patch }, harness.options), "string");
  }
  assert.equal(harness.helpers.validateDemandDraft({ ...valid, category: "OTHER", otherDescription: "Outro apoio" }, harness.options), null);
});

test("submitted demand payload normalizes contact values and discards hidden Other content", async () => {
  let submitted;
  const harness = flow(async payload => { submitted = payload; return received; });
  await button(review(harness, " Apoio solicitado "), "Confirmar envio").props.onClick();
  assert.equal(submitted.phone, "11900000042"); assert.equal(submitted.urgent, false);
  assert.equal(submitted.description, "Apoio solicitado"); assert.equal(submitted.contactConsent, true);
  assert.equal(submitted.otherDescription, undefined); assert.equal(submitted.name, undefined); assert.equal(submitted.requesterId, undefined);
});
