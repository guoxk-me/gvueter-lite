import { test, expect, type Page } from '@playwright/test';

async function openExample(page: Page) {
  await page.goto('/examples/contacts/');
  await expect(page.getByText('共 53 条', { exact: false })).toBeVisible();
}
async function createContact(page: Page, email = 'new@example.test') {
  await page.getByRole('button', { name: '新增联系人', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新增联系人' });
  await dialog.getByLabel('姓名', { exact: true }).fill('测试联系人');
  await dialog.getByLabel('邮箱', { exact: true }).fill(email);
  return dialog;
}
async function scenario(page: Page, label: string) {
  await page.locator('details').evaluate((element) => {
    element.setAttribute('open', '');
  });
  await page.getByLabel('响应行为').selectOption(label);
  await expect(page.getByLabel('响应行为')).toHaveValue(label);
}

test('search drafts, paging, selection, create/edit and keyboard validation', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await openExample(page);
  await page.getByLabel('搜索姓名或邮箱').fill('contact53@');
  await page.getByRole('button', { name: '下一页', exact: true }).click();
  await expect(page.getByText('第 2 页', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'contact21@example.test', exact: true }),
  ).toBeVisible();
  await page.getByLabel('搜索姓名或邮箱').press('Enter');
  await expect(page.getByText('共 1 条', { exact: false })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'contact53@example.test', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: '重置搜索', exact: true }).click();
  await expect(page.getByText('共 53 条', { exact: false })).toBeVisible();
  await page.getByRole('checkbox', { name: '选择 contact-001', exact: true }).click();
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByText('已选 1 条', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '新增联系人', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: '新增联系人' });
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByLabel('姓名', { exact: true })).toBeFocused();
  await dialog.getByLabel('姓名', { exact: true }).fill('新姓名');
  await dialog.getByLabel('邮箱', { exact: true }).fill('new@example.test');
  await dialog.getByRole('switch', { name: '启用', exact: true }).click();
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText('共 54 条', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '新增联系人', exact: true })).toBeFocused();
  await page.getByLabel('搜索姓名或邮箱').fill('new@example.test');
  await page.getByLabel('搜索姓名或邮箱').press('Enter');
  await expect(page.getByText('已停用', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑 新姓名', exact: true }).click();
  const editor = page.getByRole('dialog', { name: '编辑联系人' });
  await expect(editor.getByLabel('姓名', { exact: true })).toHaveValue('新姓名');
  await editor.getByLabel('姓名', { exact: true }).fill('修改姓名');
  await editor.getByRole('button', { name: '保存', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('button', { name: '编辑 修改姓名' })).toBeVisible();
  expect(errors).toEqual([]);
});
test('discard cancellation, reset and server field errors preserve the correct draft', async ({
  page,
}) => {
  await openExample(page);
  const dialog = await createContact(page, 'CONTACT1@example.test');
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(dialog.getByLabel('姓名', { exact: true })).toHaveValue('测试联系人');
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByText('该邮箱已存在', { exact: true })).toBeVisible();
  await dialog.getByLabel('邮箱', { exact: true }).fill('unique@example.test');
  await expect(dialog.getByText('该邮箱已存在', { exact: true })).toBeHidden();
  await dialog.getByRole('button', { name: '重置', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(dialog.getByLabel('姓名', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await expect(dialog).toBeHidden();
});
test('explicit failure retains input, successful write closes despite refresh failure', async ({
  page,
}) => {
  await openExample(page);
  await scenario(page, 'save-rejected');
  const dialog = await createContact(page);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByText('模拟服务明确拒绝保存')).toBeVisible();
  await expect(dialog.getByLabel('姓名', { exact: true })).toHaveValue('测试联系人');
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await scenario(page, 'refresh-failure');
  const next = await createContact(page);
  await next.getByRole('button', { name: '保存', exact: true }).click();
  await expect(next).toBeHidden();
  await expect(page.getByText('列表暂时无法读取，请重试', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'contact1@example.test', exact: true }),
  ).toBeVisible();
});
test('unknown write protection survives close and reload; manual verification never replays', async ({
  page,
}) => {
  let checks = 0;
  page.on('request', (request) => {
    if (request.url().includes('/_examples/api/operations/')) checks++;
  });
  await openExample(page);
  await scenario(page, 'unknown-pending');
  const dialog = await createContact(page);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByText('保存结果待确认。', { exact: false })).toBeVisible();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await page.getByRole('button', { name: '新增联系人', exact: true }).click();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: '保存', exact: true }),
  ).toBeDisabled();
  await expect.poll(() => checks).toBe(1);
  await page.reload();
  await expect(page.getByText('操作结果待确认', { exact: true })).toBeVisible();
  await expect(page.getByText('共 54 条', { exact: false })).toBeVisible();
  expect(checks).toBe(1);
  await scenario(page, 'normal');
  await page.getByRole('button', { name: '核实结果' }).click();
  await expect(page.getByText('操作结果待确认', { exact: true })).toBeHidden();
  await expect(page.getByText('共 54 条', { exact: false })).toBeVisible();
  expect(checks).toBe(2);
  const markers = await page.evaluate(() => sessionStorage.getItem('gvueter:pending-writes:v1'));
  expect(markers).not.toContain('new@example.test');
  expect(JSON.parse(markers!).operations).toEqual([]);
});
test('reload during an in-flight committed write restores and verifies the marker', async ({
  page,
}) => {
  await openExample(page);
  await scenario(page, 'slow-save');
  const dialog = await createContact(page);
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(dialog.getByRole('button', { name: '保存中…' })).toBeDisabled();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const response = await fetch('/_examples/api/contacts?page=1&pageSize=20');
        const body = await response.json();
        return body.data.total;
      }),
    )
    .toBe(54);
  await page.reload();
  await expect(page.getByText('共 54 条', { exact: false })).toBeVisible();
  await expect(page.getByText('操作结果待确认', { exact: true })).toBeHidden();
});
for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
]) {
  test(`desktop layout ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openExample(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const dialog = await createContact(page);
    await expect(dialog).toBeVisible();
    const bounds = await dialog.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
  });
}

test('read failures retry once and retain old rows with a single notification', async ({
  page,
}) => {
  await openExample(page);
  await scenario(page, 'read-failure');
  let reads = 0;
  page.on('request', (request) => {
    if (request.url().includes('/_examples/api/contacts?')) reads++;
  });
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByText('列表暂时无法读取，请重试', { exact: true })).toHaveCount(1);
  expect(reads).toBe(2);
  await expect(
    page.getByRole('link', { name: 'contact1@example.test', exact: true }),
  ).toBeVisible();
  await scenario(page, 'normal');
  await page.getByRole('button', { name: '刷新', exact: true }).click();
  await expect(page.getByText('共 53 条', { exact: false })).toBeVisible();
});
test('automatic confirmation never re-enables the same uncertain submission', async ({ page }) => {
  await openExample(page);
  await scenario(page, 'unknown');
  const dialog = await createContact(page);
  let writes = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/contacts')) writes++;
  });
  await dialog.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByText('已核实：保存成功。', { exact: true })).toBeVisible();
  await expect(dialog.getByRole('button', { name: '保存', exact: true })).toBeDisabled();
  expect(writes).toBe(1);
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await expect(page.getByText('共 54 条', { exact: false })).toBeVisible();
});

test('generated state styles paint switches, checkboxes and modal transitions', async ({
  page,
}) => {
  await openExample(page);
  const toggle = page.getByRole('switch', { name: '仅显示启用联系人', exact: true });
  const background = () => toggle.evaluate((element) => getComputedStyle(element).backgroundColor);
  const off = await background();
  expect(off).not.toBe('rgba(0, 0, 0, 0)');
  await toggle.click();
  await expect(toggle).toBeChecked();
  await expect.poll(background).not.toBe(off);
  await expect
    .poll(() =>
      toggle
        .locator('[data-slot="switch-thumb"]')
        .evaluate((element) => getComputedStyle(element).translate),
    )
    .not.toBe('0px');
  const checkbox = page.getByRole('checkbox', { name: '选择 contact-001', exact: true });
  const unchecked = await checkbox.evaluate((element) => getComputedStyle(element).backgroundColor);
  await checkbox.click();
  await expect(checkbox).toBeChecked();
  await expect
    .poll(() => checkbox.evaluate((element) => getComputedStyle(element).backgroundColor))
    .not.toBe(unchecked);
  const dialog = await createContact(page);
  expect(await dialog.evaluate((element) => getComputedStyle(element).animationName)).not.toBe(
    'none',
  );
});
