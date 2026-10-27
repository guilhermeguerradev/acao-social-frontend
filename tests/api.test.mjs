import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { URL, URLSearchParams } from 'node:url';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const { Event, AbortController } = globalThis;

function client(fetch) {
  const storage = new Map([['acao-social:token', 'token'], ['acao-social:user', '{}']]);
  const events = [];
  const context = {
    exports: {}, fetch, URLSearchParams, Event,
    localStorage: { getItem: key => storage.get(key), removeItem: key => storage.delete(key), setItem: (key, value) => storage.set(key, value) },
    window: { dispatchEvent: event => events.push(event.type) },
    require: id => {
      assert.equal(id, './utils');
      return { normalizeApiError: error => String(error.error) };
    },
  };
  const source = fs.readFileSync(require.resolve('../src/lib/api.ts'), 'utf8').replace('import.meta.env.VITE_API_URL', 'undefined');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(js, context);
  return { ...context.exports, storage, events };
}
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('204 deletion does not try to parse an empty body and sends JWT', async () => {
  const { endpoints } = client(async (url, options) => {
    assert.equal(url, '/api/beneficiarios/id'); assert.equal(options.method, 'DELETE');
    assert.equal(options.headers.Authorization, 'Bearer token');
    return { ok: true, status: 204, json: () => assert.fail('must not parse JSON') };
  });
  assert.equal(await endpoints.deleteBeneficiario('id'), null);
});
test('401 clears stored credentials and signals session expiration', async () => {
  const { api, storage, events } = client(async () => response({ error: 'Nao autorizado' }, 401));
  await assert.rejects(api('/beneficiarios'), error => error.error === 'Nao autorizado');
  assert.equal(storage.size, 0); assert.deepEqual(events, ['session-expired']);
});
test('403, 404, 409 and validation errors preserve backend feedback', async () => {
  for (const status of [400, 403, 404, 409]) {
    const data = { error: status === 400 ? [{ path: 'name', message: 'Obrigatorio' }] : 'Erro ' + status };
    const { endpoints } = client(async () => response(data, status));
    await assert.rejects(endpoints.updateBeneficiario('id', { name: '', telefone: '' }), error => error === data);
  }
});
test('paginated requests encode combined server filters and retain metadata', async () => {
  const { endpoints } = client(async url => {
    const params = new URL(url, 'http://local').searchParams;
    assert.equal(params.get('search'), 'Ana Maria'); assert.equal(params.get('page'), '2'); assert.equal(params.has('unused'), false);
    return response({ data: [], page: 2, limit: 20, total: 24, totalPages: 2 });
  });
  assert.equal((await endpoints.list('beneficiarios', { search: 'Ana Maria', page: 2, unused: undefined })).total, 24);
});
test('selectors collect all pages so records beyond the first 100 remain accessible', async () => {
  const pages = [];
  const { endpoints } = client(async url => {
    const page = Number(new URL(url, 'http://local').searchParams.get('page')); pages.push(page);
    return response({ data: [{ id: page }], page, limit: 100, total: 201, totalPages: 3 });
  });
  const result = await endpoints.all('beneficiarios');
  assert.deepEqual(pages, [1, 2, 3]); assert.equal(result.length, 3); assert.equal(result[2].id, 3);
});
test('dashboard indicators use backend totals rather than preview array lengths', async () => {
  const { endpoints } = client(async url => {
    const parsed = new URL(url, 'http://local');
    const total = parsed.searchParams.has('available') ? 40 : parsed.searchParams.has('startDate') ? 80 : 250;
    return response({ data: [{ id: 'preview' }], page: 1, limit: 1, total, totalPages: total });
  });
  const dashboard = await endpoints.getDashboard();
  assert.equal(dashboard.beneficiarios.length, 1); assert.equal(dashboard.totals.beneficiarios, 250);
  assert.equal(dashboard.totals.consultas, 250); assert.equal(dashboard.totals.availableAulas, 40);
});
test('beneficiary and enrollment edits use PUT and preserve empty phone clearing', async () => {
  const calls = [];
  const { endpoints } = client(async (url, options) => { calls.push({ url, method: options.method, body: JSON.parse(options.body) }); return response({}); });
  await endpoints.updateBeneficiario('person', { name: 'Ana', telefone: '' });
  await endpoints.updateMatricula('enrollment', { aulaId: 'lesson', beneficiarioId: 'person' });
  assert.equal(calls[0].method, 'PUT'); assert.equal(calls[0].body.telefone, '');
  assert.equal(calls[1].method, 'PUT'); assert.equal(calls[1].url, '/api/matriculas/enrollment');
});

test('course details use the existing authenticated lesson endpoint and support cancellation', async () => {
  const controller = new AbortController();
  const course = { id: 'lesson', titulo: 'Atividade cadastrada', vagas: 12, _count: { matriculas: 5 } };
  const { endpoints } = client(async (url, options) => {
    assert.equal(url, '/api/aulas/lesson');
    assert.equal(options.method ?? 'GET', 'GET');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(options.body, undefined);
    assert.equal(options.signal, controller.signal);
    return response(course);
  });
  assert.equal(await endpoints.getAula('lesson', controller.signal), course);
});

test('course details preserve missing-course errors instead of substituting fictitious data', async () => {
  const error = { error: 'Aula nao encontrada' };
  const { endpoints } = client(async () => response(error, 404));
  await assert.rejects(endpoints.getAula('removed-lesson'), received => received === error);
});

test('demand submission preserves the same technical key across retries and authenticates both requests', async () => {
  const calls = [];
  const { endpoints } = client(async (url, options) => {
    calls.push(JSON.parse(options.body));
    assert.equal(url, '/api/demandas'); assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer token');
    return response({ id: 'persisted-demand', status: 'RECEIVED' }, calls.length === 1 ? 201 : 200);
  });
  const payload = { description: 'Apoio solicitado', requestKey: '11111111-1111-4111-8111-111111111111' };
  assert.equal((await endpoints.createDemand(payload)).id, 'persisted-demand');
  assert.equal((await endpoints.createDemand(payload)).id, 'persisted-demand');
  assert.deepEqual(calls[0], calls[1]); assert.equal(calls[0].requesterId, undefined);
});

test('demand persistence failures are rejected and do not return a received demand', async () => {
  const failure = { error: 'Erro interno do servidor' };
  const { endpoints } = client(async () => response(failure, 500));
  await assert.rejects(endpoints.createDemand({ description: 'Apoio', requestKey: 'key' }), error => error === failure);
});

test('demand details use the authenticated endpoint with cancellation support', async () => {
  const controller = new AbortController();
  const { endpoints } = client(async (url, options) => {
    assert.equal(url, '/api/demandas/demand'); assert.equal(options.signal, controller.signal);
    assert.equal(options.headers.Authorization, 'Bearer token');
    return response({ id: 'demand', status: 'RECEIVED' });
  });
  assert.equal((await endpoints.getDemand('demand', controller.signal)).status, 'RECEIVED');
});
