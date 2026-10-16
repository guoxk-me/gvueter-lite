import { http, HttpResponse } from 'msw/http';
import { delay } from 'msw';
import { accessMockServer } from './mock-store';
import { contactFormSchema, scenarioSchema, type Contact } from './contracts';

function fail(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return HttpResponse.json(
    { code, message, fieldErrors, requestId: crypto.randomUUID() },
    { status },
  );
}
async function writeContact(request: Request, id?: string) {
  const operationId = request.headers.get('X-Example-Operation-Id');
  if (!operationId) return fail(400, 'OPERATION_ID_REQUIRED', '缺少操作标识');
  const body = contactFormSchema.safeParse(await request.json());
  if (!body.success)
    return fail(
      422,
      'VALIDATION_FAILED',
      '请检查输入',
      Object.fromEntries(body.error.issues.map((issue) => [issue.path.join('.'), issue.message])),
    );
  const outcome = await accessMockServer((state) => {
    const previous = state.operations[operationId];
    if (previous?.status === 'success') return { saved: previous.saved, scenario: state.scenario };
    if (state.scenario === 'save-rejected') {
      state.operations[operationId] = { status: 'rejected' };
      return { error: '模拟服务明确拒绝保存', scenario: state.scenario };
    }
    if (
      state.contacts.some(
        (contact) =>
          contact.id !== id && contact.email.toLowerCase() === body.data.email.toLowerCase(),
      )
    ) {
      state.operations[operationId] = { status: 'rejected' };
      return { duplicate: true, scenario: state.scenario };
    }
    if (id && !state.contacts.some((contact) => contact.id === id)) {
      state.operations[operationId] = { status: 'rejected' };
      return { missing: true, scenario: state.scenario };
    }
    const contact: Contact = {
      ...body.data,
      id: id ?? `contact-${String(state.nextId++).padStart(3, '0')}`,
    };
    if (id)
      state.contacts = state.contacts.map((existing) => (existing.id === id ? contact : existing));
    else state.contacts.push(contact);
    state.operations[operationId] = { status: 'success', saved: contact };
    state.hasWritten = true;
    return { saved: contact, scenario: state.scenario };
  });
  if ('error' in outcome) return fail(422, 'SAVE_REJECTED', outcome.error ?? '保存被拒绝');
  if ('duplicate' in outcome)
    return fail(422, 'EMAIL_TAKEN', '邮箱已存在', { email: '该邮箱已存在' });
  if ('missing' in outcome) return fail(404, 'CONTACT_NOT_FOUND', '联系人不存在');
  if (outcome.scenario === 'unknown' || outcome.scenario === 'unknown-pending')
    return HttpResponse.error();
  if (outcome.scenario === 'slow-save') await delay(5000);
  return HttpResponse.json({ data: outcome.saved }, { status: id ? 200 : 201 });
}
export const handlers = [
  http.get('/_examples/api/contacts', async ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams;
    const page = Number(query.get('page') ?? 1),
      pageSize = Number(query.get('pageSize') ?? 20);
    if (!Number.isInteger(page) || page < 1 || ![10, 20, 50, 100].includes(pageSize))
      return fail(400, 'INVALID_PAGE', '分页参数不正确');
    const snapshot = await accessMockServer((state) => state);
    if (
      snapshot.scenario === 'read-failure' ||
      (snapshot.scenario === 'refresh-failure' && snapshot.hasWritten)
    )
      return fail(503, 'READ_UNAVAILABLE', '列表暂时无法读取，请重试');
    const keyword = (query.get('keyword') ?? '').toLowerCase();
    const filtered = snapshot.contacts.filter(
      (contact) =>
        (!keyword ||
          contact.name.toLowerCase().includes(keyword) ||
          contact.email.toLowerCase().includes(keyword)) &&
        (query.get('enabledOnly') !== 'true' || contact.enabled),
    );
    const field = query.get('sortBy');
    filtered.sort((left, right) => {
      const compared =
        field === 'name' || field === 'email' ? left[field].localeCompare(right[field]) : 0;
      return (
        (query.get('sortOrder') === 'desc' ? -compared : compared) ||
        left.id.localeCompare(right.id)
      );
    });
    return HttpResponse.json({
      data: {
        records: filtered.slice((page - 1) * pageSize, page * pageSize),
        total: filtered.length,
      },
    });
  }),
  http.get('/_examples/api/contacts/:id', async ({ params }) => {
    const contact = await accessMockServer((state) =>
      state.contacts.find((entry) => entry.id === params.id),
    );
    return contact
      ? HttpResponse.json({ data: contact })
      : fail(404, 'CONTACT_NOT_FOUND', '联系人不存在');
  }),
  http.post('/_examples/api/contacts', ({ request }) => writeContact(request)),
  http.patch('/_examples/api/contacts/:id', ({ request, params }) =>
    writeContact(request, String(params.id)),
  ),
  http.get('/_examples/api/operations/:operationId', async ({ params }) => {
    const verification = await accessMockServer((state) =>
      state.scenario === 'unknown-pending'
        ? { status: 'pending' as const }
        : (state.operations[String(params.operationId)] ?? { status: 'unknown' as const }),
    );
    return HttpResponse.json({ data: verification });
  }),
  http.get('/_examples/api/scenario', async () =>
    HttpResponse.json({ data: await accessMockServer((state) => state.scenario) }),
  ),
  http.post('/_examples/api/scenario', async ({ request }) => {
    const scenario = scenarioSchema.safeParse(await request.json());
    if (!scenario.success) return fail(400, 'INVALID_SCENARIO', '未知模拟场景');
    await accessMockServer((state) => {
      state.scenario = scenario.data;
    });
    return HttpResponse.json({ data: { ok: true } });
  }),
  http.post('/_examples/api/reset', async () => {
    await accessMockServer(() => undefined, true);
    return HttpResponse.json({ data: { ok: true } });
  }),
  // AI modified: unknown mock routes fail locally instead of reaching an actual API.
  http.all('/_examples/api/*', () => fail(404, 'UNHANDLED_EXAMPLE', '未知示例接口')),
];
