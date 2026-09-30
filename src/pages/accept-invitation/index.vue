<script setup lang="ts">
import type { SupportedLocale } from '@/types/i18n/locale'

import { useI18n } from 'vue-i18n'
import { useMutation } from '@tanstack/vue-query'
import { z } from 'zod'
import PreferenceControls from '@/components/PreferenceControls.vue'
import { usersApi } from '@/api/users-api'
import { useTheme } from '@/composables/use-theme'
import { setLocale } from '@/i18n'

// AI modified: Vue helpers and shared UI controls resolve through the configured auto-import plugins.
const { t, locale } = useI18n()
const { themeMode, cycleTheme } = useTheme()
const route = useRoute()
const router = useRouter()
const { getInvitation, acceptInvitation } = usersApi
// AI modified: invitation preview is a one-time POST and keeps its bearer token outside query keys.
const previewMutation = useMutation({
  mutationFn: (invitationToken: string) => getInvitation(invitationToken),
})
const acceptMutation = useMutation({
  mutationFn: ({
    invitationToken,
    name,
    password,
  }: {
    invitationToken: string
    name: string
    password: string
  }) => acceptInvitation(invitationToken, name, password),
})
const token = new URLSearchParams(route.hash.slice(1)).get('token') ?? ''
const invitationEmail = ref('')
const name = ref('')
const password = ref('')
const isLoading = ref(true)
const isSubmitting = ref(false)
const isAccepted = ref(false)
const errorMessage = ref('')
const currentLocale = computed<SupportedLocale>(() => (locale.value as SupportedLocale) || 'zh-CN')

function toggleLocale(): void {
  setLocale(currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}

onMounted(async () => {
  if (!token) {
    errorMessage.value = t('invitation.invalidLink')
    isLoading.value = false
    return
  }
  try {
    const invitation = await previewMutation.mutateAsync(token)
    invitationEmail.value = invitation.email
  } catch {
    errorMessage.value = t('invitation.invalidLink')
  } finally {
    previewMutation.reset()
    isLoading.value = false
  }
})

async function submitInvitation(): Promise<void> {
  const schema = z.object({
    name: z.string().trim().min(1, t('invitation.nameRequired')),
    password: z.string().min(8, t('invitation.passwordMin')),
  })
  const validation = schema.safeParse({ name: name.value, password: password.value })
  if (!validation.success) {
    errorMessage.value = validation.error.issues[0]?.message ?? t('invitation.submitFailed')
    return
  }
  isSubmitting.value = true
  errorMessage.value = ''
  try {
    // AI modified: the bearer token stays in the URL fragment and is cleared after consumption.
    await acceptMutation.mutateAsync({
      invitationToken: token,
      name: validation.data.name,
      password: validation.data.password,
    })
    password.value = ''
    isAccepted.value = true
    window.history.replaceState(window.history.state, '', route.path)
  } catch {
    errorMessage.value = t('invitation.submitFailed')
  } finally {
    acceptMutation.reset()
    isSubmitting.value = false
  }
}
// AI modified: preserve the page's component identity after standardizing its entry filename.
defineOptions({ name: 'AcceptInvitationPage' })
</script>

<template>
  <div class="min-h-screen px-6 py-5 sm:px-10">
    <header class="flex items-center justify-between">
      <div class="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <span class="brand-mark size-8 text-[#5D0FC0] dark:text-[#C5B3FF]" aria-hidden="true" />
        Gvueter Lite
      </div>
      <PreferenceControls
        :theme-mode="themeMode"
        :locale="currentLocale"
        @cycle-theme="cycleTheme"
        @toggle-language="toggleLocale"
      />
    </header>
    <main class="mx-auto flex min-h-[75vh] max-w-[420px] flex-col justify-center">
      <h1 class="text-3xl font-semibold">{{ t('invitation.title') }}</h1>
      <p class="mt-2 text-sm text-muted-foreground">{{ t('invitation.description') }}</p>
      <p v-if="isLoading" class="mt-6 text-sm">{{ t('invitation.loading') }}</p>
      <div v-else-if="isAccepted" class="mt-6 space-y-4">
        <p role="status">{{ t('invitation.accepted') }}</p>
        <Button @click="router.push({ name: 'login' })">{{ t('invitation.goToLogin') }}</Button>
      </div>
      <form v-else-if="invitationEmail" class="mt-6 space-y-4" @submit.prevent="submitInvitation">
        <p class="text-sm text-muted-foreground">
          {{ t('invitation.email') }}: {{ invitationEmail }}
        </p>
        <div class="space-y-2">
          <label for="invitation-name" class="text-sm font-medium">{{
            t('invitation.name')
          }}</label>
          <Input id="invitation-name" v-model="name" autocomplete="name" :disabled="isSubmitting" />
        </div>
        <div class="space-y-2">
          <label for="invitation-password" class="text-sm font-medium">{{
            t('invitation.password')
          }}</label>
          <Input
            id="invitation-password"
            v-model="password"
            type="password"
            autocomplete="new-password"
            :disabled="isSubmitting"
          />
        </div>
        <p v-if="errorMessage" role="alert" class="text-sm text-destructive">{{ errorMessage }}</p>
        <Button type="submit" :disabled="isSubmitting">{{ t('invitation.accept') }}</Button>
      </form>
      <p v-else role="alert" class="mt-6 text-sm text-destructive">{{ errorMessage }}</p>
    </main>
  </div>
</template>

<style scoped>
.brand-mark {
  background-color: currentColor;
  mask: url('/logo.svg') center / contain no-repeat;
}
</style>
