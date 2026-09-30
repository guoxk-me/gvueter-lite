import type { AssistantTurn } from '@/types/assistant/conversation'

// AI modified: guard assistant Markdown, shared Lowlight highlighting, and HTML sanitization.
import { describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { i18n } from '@/i18n'
import AssistantAnswer from './AssistantAnswer.vue'

describe('AssistantAnswer', () => {
  it('renders Markdown and code while removing unsafe HTML attributes', () => {
    const turn: AssistantTurn = {
      id: 'turn-1',
      question: 'Show a Markdown answer',
      selectedAnswerId: 'answer-1',
      createdAt: '2026-09-29T00:00:00.000Z',
      answers: [
        {
          id: 'answer-1',
          version: 1,
          status: 'completed',
          model: 'deepseek-flash',
          provider: 'deepseek',
          errorCode: null,
          createdAt: '2026-09-29T00:00:00.000Z',
          content:
            '# 标题\n\nhttps://example.com\n\n| 列 | 值 |\n| --- | --- |\n| A | B |\n\n<img src="x" onerror="alert(1)">\n\n```ts\nconst count = 1\n```\n\n```unknown\n<script>alert(1)</script>\n```',
        },
      ],
    }

    const wrapper = mount(AssistantAnswer, {
      props: { turn, isLatest: true, hasActiveGeneration: false },
      global: { plugins: [i18n] },
    })

    expect(wrapper.find('h1').text()).toBe('标题')
    expect(wrapper.find('a').attributes('href')).toBe('https://example.com')
    expect(wrapper.find('td').text()).toBe('A')
    expect(wrapper.find('img').attributes('onerror')).toBeUndefined()
    expect(wrapper.find('pre code').text()).toBe('const count = 1')
    expect(wrapper.find('pre code .hljs-keyword').text()).toBe('const')
    expect(wrapper.findAll('pre code')[1]?.text()).toBe('<script>alert(1)</script>')
    expect(wrapper.find('script').exists()).toBe(false)
  })
})
