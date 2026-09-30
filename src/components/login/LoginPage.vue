<script setup lang="ts">
import { computed, ref } from 'vue'
import { Info, X } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useMutation } from '@tanstack/vue-query'
import PreferenceControls from '@/components/PreferenceControls.vue'
import LoginForm, { type LoginPayload } from '@/components/login/LoginForm.vue'
import { useAuth } from '@/composables/use-auth'
import { RequestError } from '@/composables/request'
import { useLoginWebMcp } from '@/composables/use-login-web-mcp'
import { useTheme } from '@/composables/useTheme'
import { setLocale, type SupportedLocale } from '@/i18n'

// AI modified: share the compact login layout, preferences, and server-auth feedback.
const { themeMode, cycleTheme } = useTheme()
const { signIn } = useAuth()
const signInMutation = useMutation({ mutationFn: signIn })
const router = useRouter()
const { t, locale } = useI18n()
// AI modified: register login preference tools only while this page is mounted.
useLoginWebMcp()

interface PageNotice {
  type: 'info' | 'warning'
  message: string
}

const pageNotice = ref<PageNotice | null>(null)
const isSubmitting = ref(false)

const currentLocale = computed<SupportedLocale>(() => {
  return (locale.value as SupportedLocale) || 'zh-CN'
})

function handleLocaleToggle(): void {
  setLocale(currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
}

// AI modified: successful login is confirmed by the protected route's server-session check.
async function handleFormSubmit(credentials: LoginPayload): Promise<void> {
  isSubmitting.value = true
  pageNotice.value = null
  try {
    await signInMutation.mutateAsync(credentials)
    await router.replace({ name: 'dashboard' })
  } catch (error: unknown) {
    let failureMessage = t('login.authUnavailable')
    if (error instanceof RequestError && error.code === 'INVALID_CREDENTIALS') {
      failureMessage = t('login.invalidCredentials')
    } else if (error instanceof RequestError && error.code === 'INVALID_SESSION') {
      // AI modified: distinguish a rejected browser session from unavailable credentials or service.
      failureMessage = t('login.sessionUnavailable')
    }
    pageNotice.value = {
      type: 'warning',
      message: failureMessage,
    }
  } finally {
    // AI modified: do not retain submitted credentials in Query mutation state.
    signInMutation.reset()
    isSubmitting.value = false
  }
}

function handleForgotPassword(): void {
  pageNotice.value = {
    type: 'info',
    message: t('login.forgotNotice'),
  }
}

function handleContactSupport(): void {
  pageNotice.value = {
    type: 'info',
    message: t('login.supportNotice'),
  }
}
</script>

<template>
  <!-- AI modified: the login page uses the shared theme background instead of a separate purple gradient. -->
  <!-- AI modified: PublicLayout provides the shared background for public routes. -->
  <div class="relative min-h-screen w-full overflow-x-hidden font-sans">
    <!-- AI modified: low-contrast edge lines add depth without competing with the centered form. -->
    <svg
      class="pointer-events-none fixed inset-0 z-0 hidden size-full text-[#E5DDED] dark:text-[#3C3147] lg:block"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke="currentColor"
      stroke-width="1"
      aria-hidden="true"
    >
      <path d="M0 206 228 434 0 662M0 267 167 434 0 601M0 328 106 434 0 540" />
      <path d="m1440 206-228 228 228 228m0-395-167 167 167 167m0-273-106 106 106 106" />
    </svg>

    <!-- Main Container -->
    <div class="relative z-10 flex min-h-screen flex-col px-6 py-4 sm:px-10 lg:px-12">
      <!-- Top Brand Header -->
      <header class="flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- AI modified: one SVG mask follows theme color without duplicate logo files. -->
          <span
            class="brand-mark block size-8 shrink-0 text-[#5D0FC0] transition-colors duration-500 dark:text-[#C5B3FF] motion-reduce:transition-none"
            aria-hidden="true"
          />
          <!-- AI modified: one wordmark keeps the product name legible at every header size. -->
          <div
            class="flex items-baseline gap-1.5 whitespace-nowrap text-[24px] tracking-tight text-[#30233E] dark:text-[#F8F5FC] sm:text-[28px]"
          >
            <span class="font-semibold">Gvueter</span>
            <span class="font-normal">Lite</span>
          </div>
        </div>
        <PreferenceControls
          :theme-mode="themeMode"
          :locale="currentLocale"
          @cycle-theme="cycleTheme"
          @toggle-language="handleLocaleToggle"
        />
      </header>

      <!-- AI modified: the form becomes the visual center on a continuous background. -->
      <main class="flex w-full flex-1 items-center justify-center py-6">
        <div class="w-full max-w-[420px]">
          <!-- AI modified: backend errors remain visible without locking the page height. -->
          <div
            v-if="pageNotice"
            role="alert"
            class="mb-4 flex items-start justify-between rounded-[8px] border border-[#8023FF]/30 bg-[#8023FF]/10 p-3 text-sm text-[#30233D] dark:border-[#A684FF]/30 dark:bg-[#A684FF]/10 dark:text-[#FCFAFF]"
          >
            <div class="flex items-center gap-2.5">
              <Info class="size-4 shrink-0 text-[#8023FF] dark:text-[#A684FF]" />
              <span>{{ pageNotice.message }}</span>
            </div>
            <button
              type="button"
              class="cursor-pointer text-[#756B7D] hover:text-[#30233D] dark:text-[#D4CADB] dark:hover:text-[#FCFAFF]"
              aria-label="Close notice"
              @click="pageNotice = null"
            >
              <X class="size-4" />
            </button>
          </div>

          <h1 class="text-[32px] font-semibold tracking-tight text-[#30233D] dark:text-[#FCFAFF]">
            {{ t('login.title') }}
          </h1>

          <!-- Description -->
          <p class="mt-1 text-sm text-[#756B7D] dark:text-[#D4CADB]">
            {{ t('login.description') }}
          </p>

          <!-- Divider -->
          <div class="my-5 h-px w-full bg-[#D9CFDF] dark:bg-[#6A5979]" />

          <!-- Form Component -->
          <LoginForm
            :is-submitting="isSubmitting"
            @submit="handleFormSubmit"
            @forgot-password="handleForgotPassword"
            @contact-support="handleContactSupport"
          />
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.brand-mark {
  background-color: currentColor;
  mask: url('/logo.svg') center / contain no-repeat;
}
</style>
