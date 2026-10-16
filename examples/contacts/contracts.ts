import { z } from 'zod';
export const contactSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  enabled: z.boolean(),
});
export const contactFormSchema = contactSchema.omit({ id: true }).extend({
  name: z.string().min(1, '请填写姓名').max(50, '姓名最多 50 个字符'),
  email: z.email('请输入有效邮箱').max(254, '邮箱最多 254 个字符'),
});
export const contactPageSchema = z.object({
  records: z.array(contactSchema),
  total: z.number().int().nonnegative(),
});
export const verificationSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('success'), saved: contactSchema }),
  z.object({ status: z.enum(['pending', 'rejected', 'unknown']) }),
]);
export type Contact = z.infer<typeof contactSchema>;
export type ContactFormValues = z.infer<typeof contactFormSchema>;
export interface ContactSearch {
  keyword: string;
  enabledOnly: boolean;
}
export type ContactContext = { mode: 'create' } | { mode: 'edit'; id: string };
export type Scenario =
  | 'normal'
  | 'read-failure'
  | 'save-rejected'
  | 'refresh-failure'
  | 'unknown'
  | 'unknown-pending'
  | 'slow-save';
export const scenarioSchema = z.enum([
  'normal',
  'read-failure',
  'save-rejected',
  'refresh-failure',
  'unknown',
  'unknown-pending',
  'slow-save',
]);
