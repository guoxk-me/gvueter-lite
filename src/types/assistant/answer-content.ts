// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface TextSegment {
  kind: 'text'
  html: string
}

export interface CodeSegment {
  kind: 'code'
  language: string
  code: string
  html: string
}
