import { toHtml } from 'hast-util-to-html'
import bash from 'highlight.js/lib/languages/bash'
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import python from 'highlight.js/lib/languages/python'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import { createLowlight } from 'lowlight'

// AI modified: Tiptap and assistant answers share one set of supported code languages.
export const codeHighlighter = createLowlight({
  bash,
  css,
  javascript,
  json,
  python,
  sql,
  typescript,
  xml,
})

export function highlightCode(code: string, language: string): string {
  const requestedLanguage = language.toLowerCase()
  if (!codeHighlighter.registered(requestedLanguage)) {
    return toHtml({ type: 'text', value: code })
  }
  return toHtml(codeHighlighter.highlight(requestedLanguage, code))
}
