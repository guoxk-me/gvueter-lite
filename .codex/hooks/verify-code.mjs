import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const snapshotDirectory = join(tmpdir(), 'gvueter-lite-codex-hooks')
const continuationPrefix = '[gvueter-lite verification]'
const checkTimeoutMs = 120_000
const codeExtensions = /\.(?:[cm]?[jt]sx?|vue|jsonc?)$/
const localeExtensions = /\.ya?ml$/

function isRelevantRootFile(filename) {
  return (
    filename === 'package.json' ||
    filename === 'pnpm-lock.yaml' ||
    filename === 'pnpm-workspace.yaml' ||
    filename === 'env.d.ts' ||
    /^tsconfig.*\.json$/.test(filename) ||
    /^(?:vite|vitest)\.config\.(?:[cm]?[jt]s)$/.test(filename)
  )
}

function collectFiles(folder, isRelevantFile, filenames) {
  if (!existsSync(folder)) return

  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const entryPath = join(folder, entry.name)
    if (entry.isDirectory()) {
      collectFiles(entryPath, isRelevantFile, filenames)
    } else if (entry.isFile() && isRelevantFile(entry.name)) {
      filenames.push(entryPath)
    }
  }
}

function snapshotCode() {
  const filenames = []

  for (const entry of readdirSync(projectRoot, { withFileTypes: true })) {
    if (entry.isFile() && isRelevantRootFile(entry.name)) {
      filenames.push(join(projectRoot, entry.name))
    }
  }

  collectFiles(join(projectRoot, 'src'), (filename) => codeExtensions.test(filename), filenames)
  collectFiles(
    join(projectRoot, 'locales'),
    (filename) => localeExtensions.test(filename),
    filenames,
  )

  const fileHashes = {}
  for (const filename of filenames.sort()) {
    const fileContents = readFileSync(filename)
    fileHashes[relative(projectRoot, filename)] = createHash('sha256')
      .update(fileContents)
      .digest('hex')
  }
  return fileHashes
}

function changedFiles(previousSnapshot, currentSnapshot) {
  const filenames = new Set([...Object.keys(previousSnapshot), ...Object.keys(currentSnapshot)])
  return [...filenames]
    .filter((filename) => previousSnapshot[filename] !== currentSnapshot[filename])
    .sort()
}

function statePathFor(sessionId) {
  const sessionKey = createHash('sha256').update(`${projectRoot}\0${sessionId}`).digest('hex')
  return join(snapshotDirectory, `${sessionKey}.json`)
}

function readState(statePath) {
  if (!existsSync(statePath)) return null
  return JSON.parse(readFileSync(statePath, 'utf8'))
}

function saveState(statePath, verificationState) {
  mkdirSync(snapshotDirectory, { recursive: true, mode: 0o700 })
  const pendingPath = `${statePath}.${process.pid}`
  writeFileSync(pendingPath, JSON.stringify(verificationState), { mode: 0o600 })
  renameSync(pendingPath, statePath)
}

function finishState(statePath) {
  rmSync(statePath, { force: true })
}

function checkOutput(commandOutput) {
  const outputText = [commandOutput.stdout, commandOutput.stderr].filter(Boolean).join('\n').trim()
  return outputText.length > 1_200 ? `…${outputText.slice(-1_200)}` : outputText
}

function runChecks() {
  const vpPath = join(projectRoot, 'node_modules/.bin/vp')
  const vueTscPath = join(projectRoot, 'node_modules/.bin/vue-tsc')
  if (!existsSync(vpPath) || !existsSync(vueTscPath)) {
    return { status: 'unavailable', details: '缺少本地依赖；未运行检查，也未自动安装。' }
  }

  const checks = [
    { name: '类型检查', arguments: ['run', 'type-check'] },
    { name: '全部单元测试', arguments: ['test', 'run'] },
  ]
  const failures = []

  for (const check of checks) {
    const commandOutput = spawnSync(vpPath, check.arguments, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: checkTimeoutMs,
      maxBuffer: 2 * 1024 * 1024,
    })

    if (commandOutput.error || commandOutput.status !== 0) {
      const failureKind =
        commandOutput.error?.code === 'ETIMEDOUT'
          ? '超过 120 秒'
          : `退出码 ${commandOutput.status ?? '未知'}`
      failures.push(`${check.name}：${failureKind}\n${checkOutput(commandOutput)}`.trim())
    }
  }

  return failures.length === 0
    ? { status: 'passed', details: '' }
    : { status: 'failed', details: failures.join('\n\n') }
}

function respond(response) {
  process.stdout.write(JSON.stringify(response))
}

function beginTurn(hookEvent, statePath) {
  const previousState = readState(statePath)
  // AI modified: preserve the original turn state when a failed check creates a repair prompt.
  if (
    previousState &&
    previousState.phase !== 'initial' &&
    hookEvent.prompt?.startsWith(continuationPrefix)
  )
    return

  saveState(statePath, { phase: 'initial', snapshot: snapshotCode() })
}

function endTurn(hookEvent, statePath) {
  const verificationState = readState(statePath)
  if (!verificationState) return

  if (verificationState.phase === 'report') {
    finishState(statePath)
    return
  }

  if (verificationState.phase === 'initial') {
    // AI modified: compare this turn's file contents so existing uncommitted work does not trigger checks.
    const modifiedFiles = changedFiles(verificationState.snapshot, snapshotCode())
    if (modifiedFiles.length === 0) {
      finishState(statePath)
      return
    }
  }

  const checkStatus = runChecks()
  if (checkStatus.status === 'passed') {
    finishState(statePath)
    return
  }

  if (
    verificationState.phase === 'initial' &&
    checkStatus.status === 'failed' &&
    !hookEvent.stop_hook_active
  ) {
    saveState(statePath, { ...verificationState, phase: 'repair' })
    respond({
      decision: 'block',
      reason: `${continuationPrefix} 本轮代码改动后的自动检查失败：\n${checkStatus.details}\n请只排查并修复本轮改动造成的问题；若属于已有问题，不要改动无关代码。完成后说明结果。Hook 会再检查一次。`,
    })
    return
  }

  saveState(statePath, { ...verificationState, phase: 'report' })
  const reportReason =
    checkStatus.status === 'unavailable'
      ? `${continuationPrefix} ${checkStatus.details} 请在最终回复中明确标为“未验证”，不要自动安装依赖。`
      : `${continuationPrefix} 自动复查后仍未通过：\n${checkStatus.details}\n请在最终回复中报告失败原因和剩余风险，本轮不要再自动修复。`
  respond({ decision: 'block', reason: reportReason })
}

try {
  const hookEvent = JSON.parse(readFileSync(0, 'utf8'))
  if (typeof hookEvent.session_id !== 'string') throw new Error('缺少 session_id')
  const statePath = statePathFor(hookEvent.session_id)

  if (hookEvent.hook_event_name === 'UserPromptSubmit') beginTurn(hookEvent, statePath)
  if (hookEvent.hook_event_name === 'Stop') endTurn(hookEvent, statePath)
} catch (hookError) {
  respond({ systemMessage: `${continuationPrefix} Hook 未能运行：${String(hookError)}` })
}
