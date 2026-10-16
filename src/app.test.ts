import { mount } from '@vue/test-utils';
import { expect, test } from 'vite-plus/test';
import App from './App.vue';

test('the generated UI button updates the visible live status', async () => {
  const wrapper = mount(App);
  try {
    expect(wrapper.get('[role="status"]').text()).toBe('等待验证');
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('已响应 1 次');
    await wrapper.get('button').trigger('click');
    expect(wrapper.get('[role="status"]').text()).toBe('已响应 2 次');
  } finally {
    wrapper.unmount();
  }
});
