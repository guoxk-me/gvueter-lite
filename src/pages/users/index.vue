<script setup lang="ts">
import type { TableColumnDef } from '@/types/data-table/table-state'
import type { FormSection } from '@/types/form/fields'
import type { InvitationRecord, InvitationStatus } from '@/types/users/invitation'
import type { UserRecord, UserStatus } from '@/types/users/user'
import type { InviteFormType, CreateFormType, EditFormType } from '@/types/users/drafts'

import { ChevronRight, House, MoreHorizontal, Plus, Search, UserCheck, UserX } from '@lucide/vue'
import { computed, h, ref, watch } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'
import { useI18n } from 'vue-i18n'
import { isCancel } from 'axios'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { useDataTable } from '@/composables/use-data-table'
import { DataTableView, TablePagination, TableSelectionBar } from '@/components/data-table'
import { ConfigurableForm } from '@/components/form'
import { ConfirmDialog, SidePanel } from '@/components/overlay'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { usersApi } from '@/api/users-api'
import { queryClient } from '@/query-client'
import { RequestError } from '@/http/http-client'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// AI modified: shared pure types live in the centralized owner directory.

// AI modified: UsersPage implements full user and invitation management matching 05.1-05.6 Pencil prototypes.

// AI modified: user types remain with their feature while the route entry lives in pages.

const { t } = useI18n()
const {
  batchUpdateUserStatus,
  createUser,
  fetchInvitations,
  fetchUsers,
  inviteUser,
  resendInvitation,
  revokeInvitation,
  updateUserName,
  updateUserStatus,
} = usersApi
// AI modified: session-cancelled writes skip local errors; Query owns write lifecycles; user actions still invalidate only affected lists.
const createUserMutation = useMutation({
  mutationFn: ({ name, email, password }: { name: string; email: string; password: string }) =>
    createUser(name, email, password),
})
const updateNameMutation = useMutation({
  mutationFn: ({ userId, name }: { userId: string; name: string }) => updateUserName(userId, name),
})
const updateStatusMutation = useMutation({
  mutationFn: ({ userId, status }: { userId: string; status: UserStatus }) =>
    updateUserStatus(userId, status),
})
const batchStatusMutation = useMutation({
  mutationFn: ({ userIds, status }: { userIds: string[]; status: UserStatus }) =>
    batchUpdateUserStatus(userIds, status),
})
const inviteMutation = useMutation({ mutationFn: (email: string) => inviteUser(email) })
const resendMutation = useMutation({
  mutationFn: (invitationId: string) => resendInvitation(invitationId),
})
const revokeMutation = useMutation({
  mutationFn: (invitationId: string) => revokeInvitation(invitationId),
})
// AI modified: only a successful server response can produce a one-time invitation link.
const invitationLink = ref('')
const isAccessDenied = computed(() =>
  [usersQuery.error.value, invitationsQuery.error.value].some(
    (failure) => failure instanceof RequestError && [401, 403].includes(failure.status),
  ),
)
const isLoadFailed = computed(() =>
  [usersQuery.error.value, invitationsQuery.error.value].some(
    (failure) =>
      failure !== null && !(failure instanceof RequestError && [401, 403].includes(failure.status)),
  ),
)

function invitationUrl(token: string): string {
  const url = new URL('/invitations/accept', window.location.origin)
  url.hash = new URLSearchParams({ token }).toString()
  return url.href
}

async function copyInvitationLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(invitationLink.value)
    toast.success(t('users.linkCopied'))
  } catch {
    toast.error(t('users.linkCopyFailed'))
  }
}

function openInvitePanel(): void {
  invitationLink.value = ''
  isInvitePanelOpen.value = true
}

function resetInvitationPanel(): void {
  isInviteDirty.value = false
  invitationLink.value = ''
}

function retryLoad(): void {
  void usersQuery.refetch()
  void invitationsQuery.refetch()
}

// Active tab: 'users' | 'invitations'
const activeTab = ref<'users' | 'invitations'>('users')

// Users query state
const userSearch = ref('')
const userStatusFilter = ref<UserStatus | 'all'>('all')
const userPage = ref({ index: 0, size: 7, total: 0 })
const usersList = ref<UserRecord[]>([])
const isUsersLoading = computed(() => usersQuery.isFetching.value)

// Invitations query state
const invSearch = ref('')
const invStatusFilter = ref<InvitationStatus | 'all'>('all')
const invPage = ref({ index: 0, size: 7, total: 0 })
const invitationsList = ref<InvitationRecord[]>([])
const isInvLoading = computed(() => invitationsQuery.isFetching.value)

// Panels and Modals state
const isInvitePanelOpen = ref(false)
const isCreatePanelOpen = ref(false)
const isEditPanelOpen = ref(false)
// AI modified: each form reports unsaved edits to its owning SidePanel.
const isInviteDirty = ref(false)
const isCreateDirty = ref(false)
const isEditDirty = ref(false)
const editingUser = ref<UserRecord | null>(null)
const isActionSubmitting = ref(false)

// Confirm dialog states
const isBatchDeactivateConfirmOpen = ref(false)
const isBatchEnableConfirmOpen = ref(false)
const isSingleStatusConfirmOpen = ref(false)
const targetUserForStatusChange = ref<{ user: UserRecord; nextStatus: UserStatus } | null>(null)

// ----------------------------------------------------
// Users Table Setup
// ----------------------------------------------------
// AI modified: translated column definitions react to language changes.
const userColumns = computed<TableColumnDef<UserRecord>[]>(() => [
  {
    id: 'select',
    header: ({ table }) => {
      const isAll = table.getIsAllPageRowsSelected()
      const isSome = table.getIsSomePageRowsSelected()
      return h(Checkbox, {
        // AI modified: Reka selection controls emit update:modelValue.
        modelValue: isAll ? true : isSome ? 'indeterminate' : false,
        'onUpdate:modelValue': (val: boolean | 'indeterminate') =>
          table.toggleAllPageRowsSelected(val === true),
        'aria-label': t('users.selectCurrentPage'),
      })
    },
    cell: ({ row }) => {
      return h(Checkbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (val: boolean | 'indeterminate') => row.toggleSelected(val === true),
        'aria-label': t('users.selectUser', { name: row.original.name }),
      })
    },
  },
  {
    accessorKey: 'name',
    header: t('users.usersTab'),
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'min-w-0' }, [
        h('div', { class: 'font-medium text-[#111827] dark:text-[#F3F4F6]' }, u.name),
        h('div', { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' }, u.email),
      ])
    },
  },
  {
    accessorKey: 'isEmailVerified',
    header: t('users.emailVerification'),
    cell: ({ row }) => {
      const verified = row.original.isEmailVerified
      if (verified) {
        return h(
          'span',
          { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' },
          t('users.verified'),
        )
      }
      return h(
        'span',
        { class: 'text-xs font-medium text-amber-600 dark:text-amber-400' },
        t('users.unverified'),
      )
    },
  },
  {
    accessorKey: 'status',
    header: t('users.accountStatus'),
    cell: ({ row }) => {
      const status = row.original.status
      if (status === 'active') {
        return h(
          'span',
          {
            class:
              'inline-flex items-center rounded-sm bg-[#ECFDF5] px-2 py-0.5 text-xs font-medium text-[#059669] dark:bg-[#064E3B]/40 dark:text-[#34D399]',
          },
          t('users.active'),
        )
      }
      return h(
        'span',
        {
          class:
            'inline-flex items-center rounded-sm bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#6B7280] dark:bg-[#374151]/40 dark:text-[#9CA3AF]',
        },
        t('users.disabled'),
      )
    },
  },
  {
    accessorKey: 'createdAt',
    header: t('users.createdAt'),
    cell: ({ row }) => {
      return h(
        'span',
        { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' },
        row.original.createdAt,
      )
    },
  },
  {
    id: 'actions',
    header: t('users.actions'),
    cell: ({ row }) => {
      const u = row.original
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            class:
              'h-7 cursor-pointer text-xs font-medium text-[#8023FF] hover:text-[#6D1BDE] dark:text-[#C5B3FF]',
            onClick: () => openEditUser(u),
          },
          () => t('users.edit'),
        ),
        h(
          DropdownMenu,
          {},
          {
            default: () => [
              h(
                DropdownMenuTrigger,
                { asChild: true },
                {
                  default: () =>
                    h(Button, { variant: 'ghost', size: 'icon-xs', class: 'size-7' }, () =>
                      h(MoreHorizontal, { class: 'size-4 text-[#9CA3AF]' }),
                    ),
                },
              ),
              h(
                DropdownMenuContent,
                { align: 'end', class: 'min-w-32' },
                {
                  default: () => [
                    u.status === 'active'
                      ? h(
                          DropdownMenuItem,
                          {
                            class: 'cursor-pointer text-xs text-destructive',
                            onClick: () => promptSingleStatusChange(u, 'disabled'),
                          },
                          () => t('users.disableAccount'),
                        )
                      : h(
                          DropdownMenuItem,
                          {
                            class: 'cursor-pointer text-xs text-[#059669]',
                            onClick: () => promptSingleStatusChange(u, 'active'),
                          },
                          () => t('users.enableAccount'),
                        ),
                    h(
                      DropdownMenuItem,
                      {
                        class: 'cursor-pointer text-xs',
                        onClick: () => toast.info(t('users.auditPending', { name: u.name })),
                      },
                      () => t('users.viewLog'),
                    ),
                  ],
                },
              ),
            ],
          },
        ),
      ])
    },
  },
])

const {
  table: usersTable,
  selectedRowIds,
  clearSelection,
} = useDataTable({
  rows: usersList,
  columns: userColumns,
  getRowId: (u) => u.id,
  page: userPage,
})

// ----------------------------------------------------
// Invitations Table Setup
// ----------------------------------------------------
const invColumns = computed<TableColumnDef<InvitationRecord>[]>(() => [
  {
    accessorKey: 'email',
    header: t('users.invitationEmail'),
    cell: ({ row }) =>
      h('span', { class: 'font-medium text-[#111827] dark:text-[#F3F4F6]' }, row.original.email),
  },
  {
    accessorKey: 'status',
    header: t('users.invitationStatus'),
    cell: ({ row }) => {
      const status = row.original.status
      if (status === 'pending') {
        return h(
          'span',
          {
            class:
              'inline-flex items-center rounded-sm bg-[#EFF6FF] px-2 py-0.5 text-xs font-medium text-[#2563EB] dark:bg-[#1E3A8A]/40 dark:text-[#60A5FA]',
          },
          t('users.invitationPending'),
        )
      }
      if (status === 'accepted' || status === 'revoked') {
        return h(
          'span',
          { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' },
          t(status === 'accepted' ? 'users.invitationAccepted' : 'users.invitationRevoked'),
        )
      }
      return h(
        'span',
        {
          class:
            'inline-flex items-center rounded-sm bg-[#F3F4F6] px-2 py-0.5 text-xs font-medium text-[#6B7280] dark:bg-[#374151]/40 dark:text-[#9CA3AF]',
        },
        t('users.invitationExpired'),
      )
    },
  },
  {
    accessorKey: 'sentAt',
    header: t('users.invitationCreatedAt'),
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' }, row.original.sentAt),
  },
  {
    accessorKey: 'expiresAt',
    header: t('users.expiresAt'),
    cell: ({ row }) =>
      h('span', { class: 'text-xs text-[#6B7280] dark:text-[#A1A1AA]' }, row.original.expiresAt),
  },
  {
    id: 'actions',
    header: t('users.actions'),
    cell: ({ row }) => {
      const inv = row.original
      if (inv.status === 'accepted' || inv.status === 'revoked') return null
      return h('div', { class: 'flex items-center gap-2' }, [
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            class:
              'h-7 cursor-pointer text-xs font-medium text-[#8023FF] hover:text-[#6D1BDE] dark:text-[#C5B3FF]',
            onClick: () => handleResendInvitation(inv),
          },
          () => t('users.renewLink'),
        ),
        h(
          Button,
          {
            variant: 'ghost',
            size: 'xs',
            class:
              'h-7 cursor-pointer text-xs text-[#6B7280] hover:text-destructive dark:text-[#A1A1AA]',
            onClick: () => handleRevokeInvitation(inv),
          },
          () => t('users.revoke'),
        ),
      ])
    },
  },
])

const { table: invTable } = useDataTable({
  rows: invitationsList,
  columns: invColumns,
  getRowId: (inv) => inv.id,
  page: invPage,
})

// ----------------------------------------------------
// Data Fetching
// ----------------------------------------------------
// AI modified: the complete filter and page state identifies each cached server read.
// AI modified: the page error state owns final read failures rather than a global Toast.
const usersQuery = useQuery({
  meta: { silent: true },
  queryKey: computed(() => [
    'users',
    userSearch.value,
    userStatusFilter.value,
    userPage.value.index,
    userPage.value.size,
  ]),
  queryFn: () =>
    fetchUsers({
      search: userSearch.value,
      status: userStatusFilter.value,
      pageIndex: userPage.value.index,
      pageSize: userPage.value.size,
    }),
})
const invitationsQuery = useQuery({
  meta: { silent: true },
  queryKey: computed(() => [
    'invitations',
    invSearch.value,
    invStatusFilter.value,
    invPage.value.index,
    invPage.value.size,
  ]),
  queryFn: () =>
    fetchInvitations({
      search: invSearch.value,
      status: invStatusFilter.value,
      pageIndex: invPage.value.index,
      pageSize: invPage.value.size,
    }),
})

watch(
  [usersQuery.data, usersQuery.error],
  ([page, error]) => {
    if (error) {
      usersList.value = []
      userPage.value = { ...userPage.value, total: 0 }
      return
    }
    if (!page) return
    const lastPageIndex = Math.max(0, Math.ceil(page.total / userPage.value.size) - 1)
    // AI modified: a shrinking result set returns to its last valid page.
    if (userPage.value.index > lastPageIndex) {
      userPage.value = { ...userPage.value, index: lastPageIndex, total: page.total }
      return
    }
    usersList.value = page.rows
    userPage.value = { ...userPage.value, total: page.total }
  },
  { immediate: true },
)

watch(
  [invitationsQuery.data, invitationsQuery.error],
  ([page, error]) => {
    if (error) {
      invitationsList.value = []
      invPage.value = { ...invPage.value, total: 0 }
      return
    }
    if (!page) return
    const lastPageIndex = Math.max(0, Math.ceil(page.total / invPage.value.size) - 1)
    if (invPage.value.index > lastPageIndex) {
      invPage.value = { ...invPage.value, index: lastPageIndex, total: page.total }
      return
    }
    invitationsList.value = page.rows
    invPage.value = { ...invPage.value, total: page.total }
  },
  { immediate: true },
)

function loadUsers(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ['users'] })
}

function loadInvitations(): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: ['invitations'] })
}

watch([userSearch, userStatusFilter], () => {
  userPage.value = { ...userPage.value, index: 0 }
})
watch([invSearch, invStatusFilter], () => {
  invPage.value = { ...invPage.value, index: 0 }
})

function handleUserPageChange(p: { index: number; size: number }): void {
  userPage.value = { ...userPage.value, index: p.index, size: p.size }
}

function handleInvPageChange(p: { index: number; size: number }): void {
  invPage.value = { ...invPage.value, index: p.index, size: p.size }
}

// ----------------------------------------------------
// Actions: Invite / Create / Edit User
// ----------------------------------------------------
const inviteSchema = computed(() =>
  z.object({
    email: z.string().trim().min(1, t('users.emailRequired')).email(t('users.emailInvalid')),
  }),
)

const inviteSections = computed<FormSection<InviteFormType>[]>(() => [
  {
    fields: [
      {
        name: 'email',
        label: t('users.emailAddress'),
        type: 'text',
        placeholder: 'name@example.com',
        description: t('users.realInvitationHelp'),
      },
    ],
  },
])

async function handleInviteSubmit(data: InviteFormType): Promise<void> {
  isActionSubmitting.value = true
  try {
    const invitation = await inviteMutation.mutateAsync(data.email)
    invitationLink.value = invitationUrl(invitation.token)
    toast.success(t('users.invitationCreated', { email: data.email }))
    isInviteDirty.value = false
    await loadInvitations()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.invitationSaveFailed'))
  } finally {
    inviteMutation.reset()
    isActionSubmitting.value = false
  }
}

const createSchema = computed(() =>
  z.object({
    name: z.string().trim().min(1, t('users.nameRequired')),
    email: z.string().trim().min(1, t('users.emailRequired')).email(t('users.emailInvalid')),
    password: z.string().min(8, t('users.realPasswordMin')),
  }),
)

// AI modified: creation fields should not reuse the administrator's saved sign-in details.
const createSections = computed<FormSection<CreateFormType>[]>(() => [
  {
    columns: 2,
    fields: [
      {
        name: 'name',
        label: t('users.name'),
        type: 'text',
        placeholder: t('users.namePlaceholder'),
        autocomplete: 'off',
      },
      {
        name: 'email',
        label: t('users.emailAddress'),
        type: 'text',
        placeholder: 'name@example.com',
        autocomplete: 'off',
      },
      {
        name: 'password',
        label: t('users.initialPassword'),
        type: 'password',
        placeholder: t('users.initialPasswordPlaceholder'),
        autocomplete: 'new-password',
        description: t('users.initialPasswordDescription'),
      },
    ],
  },
])

async function handleCreateSubmit(data: CreateFormType): Promise<void> {
  isActionSubmitting.value = true
  try {
    await createUserMutation.mutateAsync(data)
    toast.success(t('users.accountCreated', { name: data.name }))
    isCreateDirty.value = false
    isCreatePanelOpen.value = false
    await loadUsers()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.accountCreateFailed'))
  } finally {
    createUserMutation.reset()
    isActionSubmitting.value = false
  }
}

function openEditUser(user: UserRecord): void {
  editingUser.value = user
  isEditPanelOpen.value = true
}

const editSchema = computed(() =>
  z.object({
    email: z.string(),
    name: z.string().trim().min(1, t('users.displayNameRequired')),
  }),
)

const editSections = computed<FormSection<EditFormType>[]>(() => [
  {
    fields: [
      {
        name: 'email',
        label: t('users.emailAddress'),
        type: 'text',
        disabledWhen: () => true,
        description: t('users.emailReadonlyDescription'),
      },
      {
        name: 'name',
        label: t('users.name'),
        type: 'text',
        placeholder: t('users.namePlaceholder'),
      },
    ],
  },
])

async function handleEditSubmit(data: EditFormType): Promise<void> {
  if (!editingUser.value) return
  isActionSubmitting.value = true
  try {
    await updateNameMutation.mutateAsync({ userId: editingUser.value.id, name: data.name })
    toast.success(t('users.nameUpdated', { name: data.name }))
    isEditDirty.value = false
    isEditPanelOpen.value = false
    await loadUsers()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.saveFailed'))
  } finally {
    isActionSubmitting.value = false
  }
}

// ----------------------------------------------------
// Status Confirmation Handlers
// ----------------------------------------------------
function promptSingleStatusChange(user: UserRecord, nextStatus: UserStatus): void {
  targetUserForStatusChange.value = { user, nextStatus }
  isSingleStatusConfirmOpen.value = true
}

async function handleSingleStatusConfirm(): Promise<void> {
  if (!targetUserForStatusChange.value) return
  const { user, nextStatus } = targetUserForStatusChange.value
  isActionSubmitting.value = true
  try {
    await updateStatusMutation.mutateAsync({ userId: user.id, status: nextStatus })
    toast.success(t('users.userStatusUpdated', { name: user.name }))
    isSingleStatusConfirmOpen.value = false
    await loadUsers()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.actionFailed'))
  } finally {
    isActionSubmitting.value = false
  }
}

async function handleBatchDeactivateConfirm(): Promise<void> {
  if (selectedRowIds.value.length === 0) return
  isActionSubmitting.value = true
  try {
    const count = await batchStatusMutation.mutateAsync({
      userIds: selectedRowIds.value,
      status: 'disabled',
    })
    toast.success(t('users.batchStatusUpdated', { count }))
    clearSelection()
    isBatchDeactivateConfirmOpen.value = false
    await loadUsers()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.batchDisableFailed'))
  } finally {
    isActionSubmitting.value = false
  }
}

async function handleBatchEnableConfirm(): Promise<void> {
  if (selectedRowIds.value.length === 0) return
  isActionSubmitting.value = true
  try {
    const count = await batchStatusMutation.mutateAsync({
      userIds: selectedRowIds.value,
      status: 'active',
    })
    toast.success(t('users.batchStatusUpdated', { count }))
    clearSelection()
    isBatchEnableConfirmOpen.value = false
    await loadUsers()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.batchEnableFailed'))
  } finally {
    isActionSubmitting.value = false
  }
}

async function handleResendInvitation(inv: InvitationRecord): Promise<void> {
  try {
    const invitation = await resendMutation.mutateAsync(inv.id)
    invitationLink.value = invitationUrl(invitation.token)
    isInvitePanelOpen.value = true
    toast.success(t('users.invitationLinkRenewed', { email: inv.email }))
    await loadInvitations()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.invitationUpdateFailed'))
  }
}

async function handleRevokeInvitation(inv: InvitationRecord): Promise<void> {
  try {
    await revokeMutation.mutateAsync(inv.id)
    toast.info(t('users.invitationRevokedNotice', { email: inv.email }))
    await loadInvitations()
  } catch (failure: unknown) {
    if (isCancel(failure)) return
    toast.error(t('users.revokeFailed'))
  }
}
// AI modified: preserve the page's component identity after standardizing its entry filename.
defineOptions({ name: 'UsersPage' })
</script>

<template>
  <div v-if="isAccessDenied" class="rounded-lg border p-6 text-sm">
    {{ t('users.adminAccessRequired') }}
  </div>
  <div v-else class="space-y-6">
    <div v-if="isLoadFailed" role="alert" class="rounded-lg border p-4 text-sm">
      {{ t('users.loadFailed') }}
      <Button variant="outline" size="sm" class="ml-3" @click="retryLoad">
        {{ t('users.retry') }}
      </Button>
    </div>
    <!-- Top Breadcrumb & Actions -->
    <div>
      <div class="flex items-center justify-between">
        <div>
          <div class="flex items-center gap-2.5">
            <h1 class="text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
              {{ t('users.title') }}
            </h1>
          </div>
          <p class="mt-1 text-xs text-[#6B7280] dark:text-[#A1A1AA]">
            {{ t('users.subtitle') }}
          </p>
        </div>

        <div class="flex items-center gap-3">
          <Button
            variant="outline"
            class="cursor-pointer text-xs"
            @click="isCreatePanelOpen = true"
          >
            {{ t('users.directCreate') }}
          </Button>
          <Button
            class="cursor-pointer gap-1.5 bg-[#8023FF] text-xs text-white hover:bg-[#6D1BDE] dark:bg-[#8023FF] dark:hover:bg-[#6D1BDE]"
            @click="openInvitePanel"
          >
            <Plus class="size-4" />
            <span>{{ t('users.inviteUser') }}</span>
          </Button>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="mt-6 flex border-b border-[#E5E7EB] dark:border-[#30313A]">
        <button
          type="button"
          class="relative cursor-pointer px-4 pb-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'users'
              ? 'text-[#8023FF] dark:text-[#C5B3FF]'
              : 'text-[#6B7280] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:text-[#F3F4F6]'
          "
          @click="activeTab = 'users'"
        >
          <span>{{ t('users.usersTab') }}</span>
          <span class="ml-1.5 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs dark:bg-[#202128]">
            {{ userPage.total }}
          </span>
          <div
            v-if="activeTab === 'users'"
            class="absolute inset-x-0 bottom-0 h-0.5 bg-[#8023FF] dark:bg-[#C5B3FF]"
          />
        </button>

        <button
          type="button"
          class="relative cursor-pointer px-4 pb-3 text-sm font-medium transition-colors"
          :class="
            activeTab === 'invitations'
              ? 'text-[#8023FF] dark:text-[#C5B3FF]'
              : 'text-[#6B7280] hover:text-[#111827] dark:text-[#A1A1AA] dark:hover:text-[#F3F4F6]'
          "
          @click="activeTab = 'invitations'"
        >
          <span>{{ t('users.invitationsTab') }}</span>
          <span class="ml-1.5 rounded-full bg-[#F3F4F6] px-2 py-0.5 text-xs dark:bg-[#202128]">
            {{ invPage.total }}
          </span>
          <div
            v-if="activeTab === 'invitations'"
            class="absolute inset-x-0 bottom-0 h-0.5 bg-[#8023FF] dark:bg-[#C5B3FF]"
          />
        </button>
      </div>
    </div>

    <!-- TAB 1: USERS -->
    <div v-show="activeTab === 'users'" class="space-y-4">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-1 flex-wrap items-center gap-3">
          <div class="relative w-64 max-w-full">
            <Search class="absolute top-2.5 left-2.5 size-4 text-[#9CA3AF]" />
            <Input
              v-model="userSearch"
              :placeholder="t('users.searchUsers')"
              class="h-9 pl-8.5 text-xs"
            />
          </div>

          <Select v-model="userStatusFilter">
            <SelectTrigger class="h-9 w-32 text-xs">
              <SelectValue :placeholder="t('users.allStatuses')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" class="text-xs">{{ t('users.allStatuses') }}</SelectItem>
              <SelectItem value="active" class="text-xs">{{ t('users.active') }}</SelectItem>
              <SelectItem value="disabled" class="text-xs">{{ t('users.disabled') }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
          {{ t('users.userCount', { count: userPage.total }) }}
        </div>
      </div>

      <!-- TableSelectionBar for Current Page Selection -->
      <TableSelectionBar :selected-count="selectedRowIds.length" @clear="clearSelection">
        <template #actions>
          <Button
            variant="outline"
            size="xs"
            class="cursor-pointer gap-1 text-xs text-destructive hover:bg-destructive/10"
            @click="isBatchDeactivateConfirmOpen = true"
          >
            <UserX class="size-3.5" />
            <span>{{ t('users.disableSelected') }}</span>
          </Button>
          <Button
            variant="outline"
            size="xs"
            class="cursor-pointer gap-1 text-xs text-[#059669] hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            @click="isBatchEnableConfirmOpen = true"
          >
            <UserCheck class="size-3.5" />
            <span>{{ t('users.enableSelected') }}</span>
          </Button>
        </template>
      </TableSelectionBar>

      <!-- Users Table -->
      <DataTableView
        :table="usersTable"
        :is-loading="isUsersLoading"
        :empty-title="t('users.emptyUsers')"
        :empty-description="t('users.emptyUsersHint')"
      />

      <!-- Users Pagination -->
      <TablePagination
        :page-index="userPage.index"
        :page-size="userPage.size"
        :total="userPage.total"
        :page-size-options="[7, 10, 20, 50]"
        @page-change="handleUserPageChange"
      />
    </div>

    <!-- TAB 2: INVITATIONS -->
    <div v-show="activeTab === 'invitations'" class="space-y-4">
      <!-- Toolbar -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-1 flex-wrap items-center gap-3">
          <div class="relative w-64 max-w-full">
            <Search class="absolute top-2.5 left-2.5 size-4 text-[#9CA3AF]" />
            <Input
              v-model="invSearch"
              :placeholder="t('users.searchInvitations')"
              class="h-9 pl-8.5 text-xs"
            />
          </div>

          <Select v-model="invStatusFilter">
            <SelectTrigger class="h-9 w-32 text-xs">
              <SelectValue :placeholder="t('users.allInvitationStatuses')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" class="text-xs">{{
                t('users.allInvitationStatuses')
              }}</SelectItem>
              <SelectItem value="pending" class="text-xs">{{
                t('users.invitationPending')
              }}</SelectItem>
              <SelectItem value="expired" class="text-xs">{{
                t('users.invitationExpired')
              }}</SelectItem>
              <SelectItem value="accepted" class="text-xs">{{
                t('users.invitationAccepted')
              }}</SelectItem>
              <SelectItem value="revoked" class="text-xs">{{
                t('users.invitationRevoked')
              }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
          {{ t('users.invitationCount', { count: invPage.total }) }}
        </div>
      </div>

      <!-- Invitations Table -->
      <DataTableView
        :table="invTable"
        :is-loading="isInvLoading"
        :empty-title="t('users.emptyInvitations')"
        :empty-description="t('users.realInvitationEmptyDescription')"
      />

      <!-- Invitations Pagination -->
      <TablePagination
        :page-index="invPage.index"
        :page-size="invPage.size"
        :total="invPage.total"
        :page-size-options="[7, 10, 20]"
        @page-change="handleInvPageChange"
      />
    </div>

    <!-- SIDE PANEL: 邀请用户 -->
    <SidePanel
      v-model:open="isInvitePanelOpen"
      :title="t('users.inviteUser')"
      :description="t('users.realInviteDescription')"
      :is-submitting="isActionSubmitting"
      :is-dirty="isInviteDirty"
      @close="resetInvitationPanel"
    >
      <template #default="{ requestClose }">
        <div v-if="invitationLink" class="space-y-4 text-sm">
          <p>{{ t('users.invitationLinkInstructions') }}</p>
          <input
            :value="invitationLink"
            readonly
            class="w-full rounded-md border bg-background px-3 py-2"
            :aria-label="t('users.invitationLink')"
          />
          <div class="flex gap-2">
            <Button type="button" @click="copyInvitationLink">{{ t('users.copyLink') }}</Button>
            <Button type="button" variant="outline" @click="requestClose">{{
              t('users.done')
            }}</Button>
          </div>
        </div>
        <ConfigurableForm
          v-else
          :default-values="{ email: '' }"
          :validation-schema="inviteSchema"
          :sections="inviteSections"
          :is-submitting="isActionSubmitting"
          :submit-text="t('users.createInvitationLink')"
          @submit="handleInviteSubmit"
          @update:is-dirty="isInviteDirty = $event"
          @cancel="requestClose"
        />
      </template>
    </SidePanel>

    <!-- SIDE PANEL: 直接创建账号 -->
    <SidePanel
      v-model:open="isCreatePanelOpen"
      :title="t('users.createAccountTitle')"
      :description="t('users.realCreateDescription')"
      :is-submitting="isActionSubmitting"
      :is-dirty="isCreateDirty"
      @close="isCreateDirty = false"
    >
      <template #default="{ requestClose }">
        <!-- AI modified: remount each creation draft so reopening never retains a prior account's credentials. -->
        <ConfigurableForm
          v-if="isCreatePanelOpen"
          autocomplete="off"
          :default-values="{ name: '', email: '', password: '' }"
          :validation-schema="createSchema"
          :sections="createSections"
          :is-submitting="isActionSubmitting"
          :submit-text="t('users.createAccount')"
          @submit="handleCreateSubmit"
          @update:is-dirty="isCreateDirty = $event"
          @cancel="requestClose"
        />
      </template>
    </SidePanel>

    <!-- SIDE PANEL: 编辑用户姓名 -->
    <SidePanel
      v-if="editingUser"
      v-model:open="isEditPanelOpen"
      :title="t('users.editUserTitle')"
      :description="t('users.emailReadonlyDescription')"
      :is-submitting="isActionSubmitting"
      :is-dirty="isEditDirty"
      @close="isEditDirty = false"
    >
      <template #default="{ requestClose }">
        <ConfigurableForm
          :default-values="{ email: editingUser.email, name: editingUser.name }"
          :validation-schema="editSchema"
          :sections="editSections"
          :is-submitting="isActionSubmitting"
          :submit-text="t('users.saveChanges')"
          @submit="handleEditSubmit"
          @update:is-dirty="isEditDirty = $event"
          @cancel="requestClose"
        />
      </template>
    </SidePanel>

    <!-- CONFIRM DIALOG: 批量停用 -->
    <ConfirmDialog
      v-model:open="isBatchDeactivateConfirmOpen"
      :title="t('users.disableBatchTitle', { count: selectedRowIds.length })"
      :description="t('users.realStatusDescription')"
      :confirm-text="t('users.confirmDisable')"
      variant="destructive"
      :is-loading="isActionSubmitting"
      @confirm="handleBatchDeactivateConfirm"
    />

    <!-- CONFIRM DIALOG: 批量启用 -->
    <ConfirmDialog
      v-model:open="isBatchEnableConfirmOpen"
      :title="t('users.enableBatchTitle', { count: selectedRowIds.length })"
      :description="t('users.realStatusDescription')"
      :confirm-text="t('users.confirmEnable')"
      :is-loading="isActionSubmitting"
      @confirm="handleBatchEnableConfirm"
    />

    <!-- CONFIRM DIALOG: 单个状态切换 -->
    <ConfirmDialog
      v-if="targetUserForStatusChange"
      v-model:open="isSingleStatusConfirmOpen"
      :title="
        targetUserForStatusChange.nextStatus === 'disabled'
          ? t('users.disableUserTitle', { name: targetUserForStatusChange.user.name })
          : t('users.enableUserTitle', { name: targetUserForStatusChange.user.name })
      "
      :description="t('users.realStatusDescription')"
      :confirm-text="
        targetUserForStatusChange.nextStatus === 'disabled'
          ? t('users.confirmDisable')
          : t('users.confirmEnable')
      "
      :variant="targetUserForStatusChange.nextStatus === 'disabled' ? 'destructive' : 'default'"
      :is-loading="isActionSubmitting"
      @confirm="handleSingleStatusConfirm"
    />
  </div>
</template>
