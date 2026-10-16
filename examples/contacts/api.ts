import { z } from 'zod';
import { type QueryClient } from '@tanstack/vue-query';
import { createHttpClient } from '@/http/client';
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
const http = createHttpClient('/_examples/api');
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
      http.request(
        {
          url: '/contacts',
          signal,
          params: {
            ...request.search,
            page: request.page,
            pageSize: request.pageSize,
            sortBy: request.sort?.field,
            sortOrder: request.sort?.direction,
          },
        },
        contactPageSchema,
      ),
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
      http.request({ url: `/contacts/${encodeURIComponent(context.id)}`, signal }, contactSchema),
  });
  return { name: contact.name, email: contact.email, enabled: contact.enabled };
}
export function saveContact(
  input: { values: ContactFormValues; context: ContactContext },
  operationId: string,
) {
  return http.request(
    {
      method: input.context.mode === 'create' ? 'POST' : 'PATCH',
      url:
        input.context.mode === 'create'
          ? '/contacts'
          : `/contacts/${encodeURIComponent(input.context.id)}`,
      headers: { 'X-Example-Operation-Id': operationId },
      // AI modified: the resource owns its DTO and never forwards arbitrary editor fields.
      data: { name: input.values.name, email: input.values.email, enabled: input.values.enabled },
    },
    contactSchema,
  );
}
export function verifyContact(operationId: string) {
  return http.request(
    { url: `/operations/${encodeURIComponent(operationId)}` },
    verificationSchema,
  );
}
const acknowledgement = z.object({ ok: z.boolean() });
export function setScenario(scenario: Scenario) {
  return http.request(
    {
      method: 'POST',
      url: '/scenario',
      data: JSON.stringify(scenario),
      headers: { 'Content-Type': 'application/json' },
    },
    acknowledgement,
  );
}
export function resetExample() {
  return http.request({ method: 'POST', url: '/reset' }, acknowledgement);
}

export function readScenario() {
  return http.request({ url: '/scenario' }, scenarioSchema);
}
