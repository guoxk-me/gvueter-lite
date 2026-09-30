// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface SidePanelComponentProps {
  open: boolean
  title: string
  description?: string
  isDirty?: boolean
  isSubmitting?: boolean
  widthClass?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}
