// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface ConfirmDialogComponentProps {
  open: boolean
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'destructive' | 'default'
  isLoading?: boolean
}
