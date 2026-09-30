// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface WebMcpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, { type: 'string'; enum: string[] }>
    required: string[]
  }
  execute: (input: unknown) => Promise<string>
}

export interface WebMcpContext {
  registerTool: (tool: WebMcpTool, options: { signal: AbortSignal }) => Promise<void>
}
