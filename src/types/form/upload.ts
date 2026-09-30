// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface UploadItem {
  id: string
  file: File
  name: string
  size: number
  progress: number
  status: 'uploading' | 'success' | 'error'
  errorMessage?: string
  result?: UploadFileResult
  abortController?: AbortController
}

export interface FormUploadComponentProps {
  modelValue?: UploadFileResult | UploadFileResult[] | null
  uploadAdapter?: UploadAdapter
  accept?: string
  maxFileSize?: number // bytes
  multiple?: boolean
  maxFiles?: number
  disabled?: boolean
}

export interface UploadFileResult {
  id: string
  url: string
  name: string
  size?: number
  mimeType?: string
}

export interface UploadAdapter {
  upload: (
    file: File,
    onProgress: (percent: number) => void,
    signal?: AbortSignal,
  ) => Promise<UploadFileResult>
}
