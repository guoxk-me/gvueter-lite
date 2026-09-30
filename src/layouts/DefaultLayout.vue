<script setup lang="ts">
import type { AssistantProvider } from '@/types/assistant/model'
import type { SupportedLocale } from '@/types/i18n/locale'

import { computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { useLocalStorage } from '@vueuse/core'
import {
  Activity,
  Bell,
  ChevronRight,
  ChevronUp,
  House,
  KeyRound,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
} from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useMutation } from '@tanstack/vue-query'
import { useRoute, useRouter } from 'vue-router'
import PreferenceControls from '@/components/PreferenceControls.vue'
import AssistantDrawer from '@/components/assistant/AssistantDrawer.vue'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/composables/use-auth'
import { useAssistant } from '@/composables/assistant/use-assistant'
import { useTheme } from '@/composables/use-theme'
import { setLocale } from '@/i18n'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const { currentUser, signOut } = useAuth()
const signOutMutation = useMutation({ mutationFn: signOut })
const { themeMode, cycleTheme } = useTheme()
const assistant = useAssistant()
const assistantButton = ref<HTMLButtonElement | null>(null)
const drawerExpansionOrigin = shallowRef<string | null>(null)
const drawerExpansionPosition = shallowRef<number | null>(null)

const pageTitle = computed(() => {
  if (route.path === '/main/users') {
    return t('dashboard.userManagement')
  }
  if (route.path === '/main/assistant/settings') return t('assistant.settings.title')
  if (route.path === '/main/assistant') return t('assistant.title')
  return t('dashboard.title')
})
// AI modified: remember the sidebar preference across refreshes without storing session data.
const isSidebarCollapsed = useLocalStorage('gvueter-sidebar-collapsed', false)
const isSidebarNarrow = shallowRef(isSidebarCollapsed.value)
const areSidebarLabelsMounted = shallowRef(!isSidebarCollapsed.value)
const areSidebarLabelsVisible = shallowRef(!isSidebarCollapsed.value)
const notice = shallowRef<string | null>(null)
const isSigningOut = shallowRef(false)
let sidebarTimer: ReturnType<typeof setTimeout> | undefined
let labelFrame: number | undefined

const currentLocale = computed<SupportedLocale>(() =>
  locale.value === 'en-US' ? 'en-US' : 'zh-CN',
)
const userName = computed(() => currentUser.value?.name || currentUser.value?.email || '')
const userInitial = computed(() => userName.value.charAt(0).toUpperCase())

function toggleSidebar(): void {
  if (sidebarTimer) clearTimeout(sidebarTimer)
  if (labelFrame) cancelAnimationFrame(labelFrame)
  isSidebarCollapsed.value = !isSidebarCollapsed.value
  // AI modified: fade labels before narrowing; reveal them only after the rail has expanded.
  if (isSidebarCollapsed.value) {
    areSidebarLabelsVisible.value = false
    sidebarTimer = setTimeout(() => {
      areSidebarLabelsMounted.value = false
      isSidebarNarrow.value = true
    }, 100)
  } else {
    isSidebarNarrow.value = false
    sidebarTimer = setTimeout(() => {
      areSidebarLabelsMounted.value = true
      labelFrame = requestAnimationFrame(() => {
        areSidebarLabelsVisible.value = true
      })
    }, 200)
  }
}

onUnmounted(() => {
  if (sidebarTimer) clearTimeout(sidebarTimer)
  if (labelFrame) cancelAnimationFrame(labelFrame)
  assistant.stopAssistant()
})

onMounted(() => {
  void assistant.startAssistant()
})

// AI modified: only browser back to the page from which a drawer expanded restores that drawer.
watch(
  () => route.fullPath,
  (path, previousPath) => {
    const wasInAssistant = previousPath.startsWith('/main/assistant')
    if (route.path === '/main/assistant' || route.path === '/main/assistant/settings')
      assistant.isPanelOpen.value = false
    else if (
      wasInAssistant &&
      path === drawerExpansionOrigin.value &&
      window.history.state?.position === drawerExpansionPosition.value
    ) {
      assistant.isPanelOpen.value = true
      drawerExpansionOrigin.value = null
      drawerExpansionPosition.value = null
    } else if (wasInAssistant) {
      drawerExpansionOrigin.value = null
      drawerExpansionPosition.value = null
    }
  },
)

function openAssistant(): void {
  if (route.path === '/main/assistant') {
    notice.value = t('assistant.alreadyOpen')
    return
  }
  assistant.isPanelOpen.value = true
  assistant.isPanelHistoryVisible.value = false
}

function closeAssistant(): void {
  assistant.isPanelOpen.value = false
  assistantButton.value?.focus()
}

function rememberDrawerExpansion(): void {
  if (!assistant.isPanelOpen.value) return
  // AI modified: the sidebar and panel expand button must restore the same drawer on browser back.
  drawerExpansionOrigin.value = route.fullPath
  drawerExpansionPosition.value = window.history.state?.position ?? null
  assistant.shouldFocusComposerOnPage.value = document.activeElement instanceof HTMLTextAreaElement
  assistant.isPanelOpen.value = false
}

async function expandAssistant(): Promise<void> {
  rememberDrawerExpansion()
  await router.push('/main/assistant')
}

async function openAssistantSettings(provider?: AssistantProvider): Promise<void> {
  rememberDrawerExpansion()
  await router.push({
    name: 'assistant-settings',
    query: { returnTo: 'panel', ...(provider ? { provider } : {}) },
  })
}

function toggleLanguage(): void {
  setLocale(currentLocale.value === 'zh-CN' ? 'en-US' : 'zh-CN')
  notice.value = null
}

function showPending(feature: string): void {
  notice.value = t('dashboard.pendingFeature', { feature })
}

async function handleSignOut(): Promise<void> {
  isSigningOut.value = true
  try {
    await signOutMutation.mutateAsync()
    assistant.clearAssistant()
    await router.replace({ name: 'login' })
  } catch {
    notice.value = t('dashboard.signOutFailed')
  } finally {
    isSigningOut.value = false
  }
}
</script>

<template>
  <!-- AI modified: the default signed-in layout keeps scrolling inside each feature page. -->
  <div class="flex h-dvh w-full overflow-hidden bg-background text-[#111827] dark:text-[#F3F4F6]">
    <!-- AI modified: include theme colors in the sidebar transition alongside its width. -->
    <aside
      class="relative hidden h-full shrink-0 flex-col border-r border-[#E5E7EB] bg-white transition-[width,background-color,color,border-color] duration-200 motion-reduce:transition-none dark:border-[#30313A] dark:bg-[#1B1C22] md:flex"
      :class="isSidebarNarrow ? 'w-16' : 'w-52'"
    >
      <div class="flex h-14 items-center gap-2 px-4">
        <span
          class="brand-mark block size-8 shrink-0 text-[#5D0FC0] dark:text-[#C5B3FF]"
          aria-hidden="true"
        />
        <!-- AI modified: the expanded brand shares the login wordmark; the collapsed rail keeps only the mark. -->
        <div
          v-if="areSidebarLabelsMounted"
          class="flex min-w-0 items-baseline gap-1 overflow-hidden whitespace-nowrap text-[18px] tracking-tight text-[#30233E] transition-opacity duration-100 dark:text-[#F8F5FC]"
          :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
        >
          <span class="font-semibold">Gvueter</span>
          <span class="font-normal">Lite</span>
        </div>
      </div>

      <!-- AI modified: the panel glyph alone marks the control, so its button has no visible frame. -->
      <button
        type="button"
        :aria-label="
          isSidebarCollapsed ? t('dashboard.expandSidebar') : t('dashboard.collapseSidebar')
        "
        class="absolute top-3 -right-3.5 z-20 flex h-8 w-7 cursor-pointer items-center justify-center text-[#6B7280] hover:text-[#8023FF] focus-visible:outline-2 focus-visible:outline-[#8023FF] dark:text-[#A1A1AA] dark:hover:text-[#C5B3FF]"
        @click="toggleSidebar"
      >
        <!-- AI modified: the icon depicts the action available in the current sidebar state. -->
        <PanelLeftOpen v-if="isSidebarCollapsed" class="size-[18px]" />
        <PanelLeftClose v-else class="size-[18px]" />
      </button>

      <nav class="min-h-0 flex-1 px-2 pt-4" :aria-label="t('dashboard.navigation')">
        <RouterLink
          to="/main"
          :aria-label="t('dashboard.title')"
          class="flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors"
          :class="
            route.path === '/main'
              ? 'bg-[#F1E9FF] text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]'
              : 'text-[#374151] hover:text-[#8023FF] dark:text-[#D5D6DC] dark:hover:text-[#C5B3FF]'
          "
        >
          <LayoutDashboard class="size-[18px] shrink-0" />
          <span
            v-if="areSidebarLabelsMounted"
            class="overflow-hidden whitespace-nowrap transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('dashboard.title') }}</span
          >
        </RouterLink>
        <button
          type="button"
          :aria-label="t('dashboard.overview')"
          class="mt-1 flex h-10 w-full cursor-pointer items-center gap-3 rounded-md px-3 text-left text-sm text-[#6B7280] hover:text-[#8023FF] dark:text-[#A1A1AA] dark:hover:text-[#C5B3FF]"
          @click="showPending(t('dashboard.overview'))"
        >
          <Activity class="size-[18px] shrink-0" />
          <span
            v-if="areSidebarLabelsMounted"
            class="min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('dashboard.overview') }}</span
          >
          <span
            v-if="areSidebarLabelsMounted"
            class="whitespace-nowrap text-[11px] transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('dashboard.soon') }}</span
          >
        </button>
        <RouterLink
          to="/main/users"
          :aria-label="t('dashboard.userManagement')"
          class="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors"
          :class="
            route.path === '/main/users'
              ? 'bg-[#F1E9FF] text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]'
              : 'text-[#374151] hover:text-[#8023FF] dark:text-[#D5D6DC] dark:hover:text-[#C5B3FF]'
          "
        >
          <Users class="size-[18px] shrink-0" />
          <span
            v-if="areSidebarLabelsMounted"
            class="overflow-hidden whitespace-nowrap transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('dashboard.userManagement') }}</span
          >
        </RouterLink>
        <RouterLink
          to="/main/assistant"
          :aria-label="t('assistant.title')"
          class="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors"
          :class="
            route.path === '/main/assistant'
              ? 'bg-[#F1E9FF] text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]'
              : 'text-[#374151] hover:text-[#8023FF] dark:text-[#D5D6DC] dark:hover:text-[#C5B3FF]'
          "
          @click="rememberDrawerExpansion"
        >
          <span
            class="flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] border-current text-[8px] font-bold leading-none"
            aria-hidden="true"
            >AI</span
          >
          <span
            v-if="areSidebarLabelsMounted"
            class="overflow-hidden whitespace-nowrap transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('assistant.title') }}</span
          >
        </RouterLink>
        <!-- AI modified: the separate settings destination remembers a chat or drawer origin for return. -->
        <RouterLink
          :to="{
            name: 'assistant-settings',
            query: assistant.isPanelOpen.value
              ? { returnTo: 'panel' }
              : route.path === '/main/assistant'
                ? { returnTo: 'chat' }
                : {},
          }"
          :aria-label="t('assistant.settings.title')"
          class="mt-1 flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors"
          :class="
            route.path === '/main/assistant/settings'
              ? 'bg-[#F1E9FF] text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]'
              : 'text-[#374151] hover:text-[#8023FF] dark:text-[#D5D6DC] dark:hover:text-[#C5B3FF]'
          "
          @click="rememberDrawerExpansion"
        >
          <KeyRound class="size-[18px] shrink-0" />
          <span
            v-if="areSidebarLabelsMounted"
            class="overflow-hidden whitespace-nowrap transition-opacity duration-100"
            :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
            >{{ t('assistant.settings.title') }}</span
          >
        </RouterLink>
      </nav>

      <div class="border-t border-[#E5E7EB] p-2 dark:border-[#30313A]">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              :aria-label="t('dashboard.accountMenu')"
              class="flex h-[60px] w-full cursor-pointer items-center gap-2.5 rounded-md px-2 text-left hover:bg-[#F7F8FA] dark:hover:bg-[#25262C]"
            >
              <span
                class="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#F1E9FF] text-sm font-semibold text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]"
                >{{ userInitial }}</span
              >
              <span
                v-if="areSidebarLabelsMounted"
                class="min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-opacity duration-100"
                :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
              >
                <span class="block truncate text-[13px] font-medium">{{ userName }}</span>
                <span class="block truncate text-[11px] text-[#6B7280] dark:text-[#A1A1AA]">{{
                  currentUser?.email
                }}</span>
              </span>
              <ChevronUp
                v-if="areSidebarLabelsMounted"
                class="size-4 shrink-0 text-[#9CA3AF] transition-opacity duration-100"
                :class="areSidebarLabelsVisible ? 'opacity-100' : 'opacity-0'"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" class="min-w-44">
            <DropdownMenuItem
              class="cursor-pointer gap-2"
              :disabled="isSigningOut"
              @click="handleSignOut"
            >
              <LogOut class="size-4" />
              {{ t('dashboard.signOut') }}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>

    <div class="flex min-h-0 min-w-0 flex-1 flex-col">
      <header
        class="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-[#E5E7EB] bg-white px-[18px] dark:border-[#30313A] dark:bg-[#1B1C22]"
      >
        <div class="flex min-w-0 items-center gap-2 text-[13px]">
          <RouterLink
            to="/main"
            class="flex items-center gap-1 text-[#6B7280] hover:text-[#8023FF] dark:text-[#A1A1AA] dark:hover:text-[#C5B3FF]"
          >
            <House class="size-4" />
            <span class="hidden sm:inline">{{ t('dashboard.home') }}</span>
          </RouterLink>
          <ChevronRight class="size-3.5 shrink-0 text-[#9CA3AF]" />
          <span class="truncate font-medium">{{ pageTitle }}</span>
        </div>
        <div class="flex items-center gap-1">
          <PreferenceControls
            :theme-mode="themeMode"
            :locale="currentLocale"
            @cycle-theme="cycleTheme"
            @toggle-language="toggleLanguage"
          />
          <button
            type="button"
            class="mr-2 hidden h-9 w-[228px] cursor-pointer items-center gap-2 rounded-md bg-[#F5F6F8] px-3 text-left text-xs text-[#7B818B] hover:text-[#8023FF] dark:bg-[#25262C] dark:text-[#A1A1AA] dark:hover:text-[#C5B3FF] lg:flex"
            @click="showPending(t('dashboard.search'))"
          >
            <Search class="size-4" />
            <span>{{ t('dashboard.searchHint') }}</span>
          </button>
          <button
            type="button"
            :aria-label="t('dashboard.notifications')"
            class="flex size-11 cursor-pointer items-center justify-center text-[#574662] hover:text-[#8023FF] focus-visible:outline-2 focus-visible:outline-[#8023FF] dark:text-[#D9CEE3] dark:hover:text-[#C5B3FF]"
            @click="showPending(t('dashboard.notifications'))"
          >
            <Bell class="size-5" />
          </button>
          <button
            ref="assistantButton"
            type="button"
            :aria-label="t('assistant.openPanel')"
            class="relative flex size-11 cursor-pointer items-center justify-center text-[#574662] hover:text-[#8023FF] focus-visible:outline-2 focus-visible:outline-[#8023FF] dark:text-[#D9CEE3] dark:hover:text-[#C5B3FF]"
            @click="openAssistant"
          >
            <span
              class="flex size-5 items-center justify-center rounded-[5px] border-[1.5px] border-current text-[9px] font-bold leading-none"
              aria-hidden="true"
              >AI</span
            >
            <span
              v-if="assistant.hasActiveGeneration.value"
              class="absolute right-2 top-2 size-1.5 rounded-full bg-violet-500"
            />
          </button>
        </div>
      </header>

      <main
        class="min-h-0 min-w-0 flex-1 overflow-x-hidden overscroll-contain"
        :class="
          route.path === '/main/assistant' ? 'overflow-y-hidden' : 'overflow-y-auto px-[18px] py-5'
        "
      >
        <!-- AI modified: let authenticated pages use the available canvas on wide monitors. -->
        <div class="w-full" :class="route.path === '/main/assistant' ? 'h-full' : ''">
          <div
            v-if="notice"
            role="status"
            class="mb-4 flex items-center justify-between gap-3 rounded-md border border-[#DDD6FF] bg-[#F5F3FF] px-3 py-2 text-sm text-[#5D0FC0] dark:border-[#493566] dark:bg-[#241B31] dark:text-[#D1BEFF]"
          >
            <span>{{ notice }}</span>
            <button
              type="button"
              :aria-label="t('dashboard.dismissNotice')"
              class="cursor-pointer text-lg leading-none"
              @click="notice = null"
            >
              ×
            </button>
          </div>
          <RouterView v-slot="{ Component }">
            <component :is="Component" :show-pending="showPending" />
          </RouterView>
        </div>
      </main>
    </div>
    <AssistantDrawer
      :open="assistant.isPanelOpen.value && route.path !== '/main/assistant'"
      @close="closeAssistant"
      @expand="expandAssistant"
      @settings="openAssistantSettings"
    />
  </div>
</template>

<style scoped>
.brand-mark {
  background-color: currentColor;
  mask: url('/logo.svg') center / contain no-repeat;
}
</style>
