import { z } from 'zod';
import { type QueryClient } from '@tanstack/vue-query';
import { createHttpClient } from '@/http';
import type { TableQuery, TableRequest } from '@/components/table';
import {
  contactPageSchema,
  contactSchema,
  verificationSchema,
  scenarioSchema,
  type Contact,
  type ContactContext,
  type ContactFormValues,
  type ContactSearch,
  type Scenario,
} from './contracts';
// AI modified: the example owns its client; credentials and business schemas are explicit.
const http = createHttpClient({ baseURL: '/_examples/api', withCredentials: true });
export const contactKeys = {
  lists: (identity: string) => [identity, 'contacts', 'list'] as const,
  detail: (identity: string, id: string) => [identity, 'contacts', 'detail', id] as const,
};
export function contactListQuery(
  identity: string,
  request: TableRequest<ContactSearch, undefined>,
) {
  return {
    queryKey: [...contactKeys.lists(identity), request],
    queryFn: ({ signal }: { signal: AbortSignal }) =>
      http.get('/contacts', {
        signal,
        params: {
          ...request.search,
          page: request.page,
          pageSize: request.pageSize,
          sortBy: request.sort?.field,
          sortOrder: request.sort?.direction,
        },
        schema: contactPageSchema,
      }),
  } satisfies TableQuery<Contact>;
}
export async function loadContact(
  client: QueryClient,
  identity: string,
  context: ContactContext,
): Promise<ContactFormValues> {
  if (context.mode === 'create') return { name: '', email: '', enabled: true };
  const contact = await client.fetchQuery({
    queryKey: contactKeys.detail(identity, context.id),
    queryFn: ({ signal }) =>
      http.get(`/contacts/${encodeURIComponent(context.id)}`, { signal, schema: contactSchema }),
  });
  return { name: contact.name, email: contact.email, enabled: contact.enabled };
}
export function saveContact(
  input: { values: ContactFormValues; context: ContactContext },
  operationId: string,
) {
  const save = input.context.mode === 'create' ? http.post : http.patch;
  return save(
    input.context.mode === 'create'
      ? '/contacts'
      : `/contacts/${encodeURIComponent(input.context.id)}`,
    // AI modified: the resource constructs its DTO instead of forwarding arbitrary editor fields.
    { name: input.values.name, email: input.values.email, enabled: input.values.enabled },
    {
      headers: { 'X-Example-Operation-Id': operationId },
      schema: contactSchema,
    },
  );
}
export function verifyContact(operationId: string) {
  return http.get(`/operations/${encodeURIComponent(operationId)}`, { schema: verificationSchema });
}
const acknowledgement = z.object({ ok: z.boolean() });
export function setScenario(scenario: Scenario) {
  // AI modified: this endpoint accepts a JSON scalar, not Axios's default text/form body.
  return http.post('/scenario', scenario, {
    schema: acknowledgement,
    headers: { 'Content-Type': 'application/json' },
  });
}
export function resetExample() {
  return http.post('/reset', undefined, { schema: acknowledgement });
}

export function readScenario() {
  return http.get('/scenario', { schema: scenarioSchema });
}
