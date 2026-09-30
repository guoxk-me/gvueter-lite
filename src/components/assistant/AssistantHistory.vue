<script setup lang="ts">
import { Check, MessageSquarePlus, MoreHorizontal, Pencil, Trash2, X } from '@lucide/vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import { useAssistant } from '@/composables/assistant/use-assistant'

const { t } = useI18n()
const {
  conversations,
  selectedConversationId,
  newConversation,
  selectConversation,
  renameConversation,
  deleteConversation,
} = useAssistant()
const renamingId = ref<string | null>(null)
const pendingTitle = ref('')
const deletingId = ref<string | null>(null)
const isDeleting = ref(false)

function startRename(conversationId: string, title: string): void {
  renamingId.value = conversationId
  pendingTitle.value = title
}

async function saveRename(): Promise<void> {
  if (renamingId.value && pendingTitle.value.trim()) {
    await renameConversation(renamingId.value, pendingTitle.value.trim())
  }
  renamingId.value = null
}

async function confirmDelete(): Promise<void> {
  if (!deletingId.value) return
  isDeleting.value = true
  await deleteConversation(deletingId.value)
  isDeleting.value = false
  deletingId.value = null
}
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-[#FAF9FB] dark:bg-[#1D1C22]">
    <div class="flex h-14 shrink-0 items-center justify-between px-4">
      <span class="text-xs font-semibold tracking-wide text-muted-foreground">{{
        t('assistant.history')
      }}</span>
      <button
        type="button"
        :aria-label="t('assistant.newConversation')"
        class="rounded-md p-1.5 text-muted-foreground hover:bg-[#EEEAF4] hover:text-foreground dark:hover:bg-[#313039]"
        @click="newConversation"
      >
        <MessageSquarePlus class="size-4" />
      </button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
      <p
        v-if="conversations.length === 0"
        class="px-3 py-4 text-xs leading-5 text-muted-foreground"
      >
        {{ t('assistant.emptyHistory') }}
      </p>
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="group relative mb-0.5 rounded-lg"
        :class="
          selectedConversationId === conversation.id
            ? 'bg-[#EDE6F5] dark:bg-[#30263A]'
            : 'hover:bg-[#F0EEF2] dark:hover:bg-[#28272F]'
        "
      >
        <div v-if="renamingId === conversation.id" class="flex h-10 items-center gap-1 px-2">
          <input
            v-model="pendingTitle"
            maxlength="80"
            class="min-w-0 flex-1 rounded border border-[#A98ACF] bg-background px-1.5 py-1 text-xs outline-none"
            :aria-label="t('assistant.rename')"
            @keydown.enter="saveRename"
            @keydown.esc="renamingId = null"
          />
          <button type="button" :aria-label="t('assistant.save')" @click="saveRename">
            <Check class="size-4" />
          </button>
          <button type="button" :aria-label="t('assistant.cancel')" @click="renamingId = null">
            <X class="size-4" />
          </button>
        </div>
        <div v-else class="flex min-h-10 items-center gap-1 px-2">
          <button
            type="button"
            class="min-w-0 flex-1 cursor-pointer truncate py-2 text-left text-[13px]"
            :title="conversation.title"
            @click="selectConversation(conversation.id)"
          >
            <span
              v-if="conversation.activeAnswerId"
              class="mr-1.5 inline-block size-1.5 animate-pulse rounded-full bg-violet-500 align-middle"
            />{{ conversation.title }}
          </button>
          <div
            class="flex shrink-0 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100"
          >
            <button
              type="button"
              :aria-label="t('assistant.rename')"
              class="rounded p-1 text-muted-foreground hover:text-foreground"
              @click="startRename(conversation.id, conversation.title)"
            >
              <Pencil class="size-3.5" />
            </button>
            <button
              type="button"
              :aria-label="t('assistant.delete')"
              class="rounded p-1 text-muted-foreground hover:text-destructive"
              @click="deletingId = conversation.id"
            >
              <Trash2 class="size-3.5" />
            </button>
          </div>
          <MoreHorizontal
            class="hidden size-4 text-muted-foreground lg:block lg:group-hover:hidden lg:group-focus-within:hidden"
          />
        </div>
      </div>
    </div>
  </div>
  <ConfirmDialog
    :open="deletingId !== null"
    :title="t('assistant.deleteTitle')"
    :description="t('assistant.deleteDescription')"
    :confirm-text="t('assistant.delete')"
    :is-loading="isDeleting"
    variant="destructive"
    @update:open="
      (open) => {
        if (!open) deletingId = null
      }
    "
    @confirm="confirmDelete"
  />
</template>
