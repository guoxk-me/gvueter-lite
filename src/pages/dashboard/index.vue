<script setup lang="ts">
import { computed } from 'vue'
import { Activity, ArrowUpRight, Clock3, ShieldCheck, UserRoundPlus, Users } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
defineProps<{ showPending: (feature: string) => void }>()

// AI modified: the prototype's statistics stay explicitly illustrative until real data APIs exist.
const metrics = computed(() => [
  {
    label: t('dashboard.activeUsers'),
    count: '1,284',
    change: t('dashboard.activeUsersChange'),
    needsAttention: false,
    icon: Users,
  },
  {
    label: t('dashboard.newToday'),
    count: '38',
    change: t('dashboard.newTodayChange'),
    needsAttention: false,
    icon: UserRoundPlus,
  },
  {
    label: t('dashboard.pendingTasks'),
    count: '12',
    change: t('dashboard.pendingTasksChange'),
    needsAttention: true,
    icon: Clock3,
  },
  {
    label: t('dashboard.monthlyVisits'),
    count: '24,680',
    change: t('dashboard.monthlyVisitsChange'),
    needsAttention: false,
    icon: Activity,
  },
])

const activities = computed(() => [
  {
    initial: t('dashboard.activityOneInitial'),
    title: t('dashboard.activityOne'),
    time: t('dashboard.activityOneTime'),
  },
  {
    initial: t('dashboard.activityTwoInitial'),
    title: t('dashboard.activityTwo'),
    time: t('dashboard.activityTwoTime'),
  },
  {
    initial: t('dashboard.activityThreeInitial'),
    title: t('dashboard.activityThree'),
    time: t('dashboard.activityThreeTime'),
  },
])
// AI modified: preserve the page's component identity after standardizing its entry filename.
defineOptions({ name: 'DashboardPage' })
</script>

<template>
  <!-- AI modified: the dashboard supplies content to the shared authenticated layout. -->
  <div class="w-full">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 class="text-[28px] font-semibold tracking-tight">{{ t('dashboard.title') }}</h1>
        <p class="mt-1 text-[13px] text-[#6B7280] dark:text-[#A1A1AA]">
          {{ t('dashboard.subtitle') }}
        </p>
      </div>
      <span
        class="rounded-md bg-[#F0F1F3] px-3 py-1.5 text-[11px] text-[#616873] dark:bg-[#25262C] dark:text-[#AEB0BB]"
        >{{ t('dashboard.sampleData') }}</span
      >
    </div>

    <div class="mt-4 border-t border-[#E5E7EB] dark:border-[#30313A]" />
    <!-- AI modified: soft metric surfaces restore the prototype's hierarchy without adding more outlined cards. -->
    <section
      :aria-label="t('dashboard.metrics')"
      class="grid grid-cols-2 gap-3 py-3 xl:grid-cols-4"
    >
      <div
        v-for="metric in metrics"
        :key="metric.label"
        class="min-w-0 rounded-[8px] bg-[#F6F7F9] px-4 py-4 dark:bg-[#1B1C22]"
      >
        <div
          class="flex items-center justify-between gap-2 text-xs text-[#6B7280] dark:text-[#A1A1AA]"
        >
          <span>{{ metric.label }}</span>
          <component :is="metric.icon" class="size-4 text-[#8023FF] dark:text-[#A684FF]" />
        </div>
        <strong class="mt-4 block text-[27px] font-semibold leading-none tracking-tight">{{
          metric.count
        }}</strong>
        <span
          class="mt-5 block text-[11px] font-medium"
          :class="
            metric.needsAttention
              ? 'text-[#B85D15] dark:text-[#F0AA73]'
              : 'text-[#16803C] dark:text-[#74D79A]'
          "
          >{{ metric.change }}</span
        >
      </div>
    </section>

    <div class="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1.85fr)_minmax(280px,1fr)]">
      <section
        class="min-w-0 rounded-[8px] border border-[#E8E9ED] bg-white p-4 dark:border-[#30313A] dark:bg-[#1B1C22]"
        :aria-label="t('dashboard.visitTrend')"
      >
        <div class="flex items-start justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">{{ t('dashboard.visitTrend') }}</h2>
            <p class="mt-1 text-xs text-[#7B818B] dark:text-[#A1A1AA]">
              {{ t('dashboard.lastSevenDays') }}
            </p>
          </div>
          <button
            type="button"
            class="cursor-pointer rounded-md bg-[#F5F6F8] px-3 py-2 text-xs text-[#374151] hover:text-[#8023FF] dark:bg-[#25262C] dark:text-[#D5D6DC] dark:hover:text-[#C5B3FF]"
            @click="showPending(t('dashboard.timeRange'))"
          >
            {{ t('dashboard.lastSevenDays') }}
          </button>
        </div>
        <!-- AI modified: axis labels and a visible final point make the illustrative chart readable at laptop widths. -->
        <div class="mt-4 min-w-0">
          <div class="flex gap-2">
            <div
              class="flex h-[178px] w-9 shrink-0 flex-col justify-between py-1 text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]"
              aria-hidden="true"
            >
              <span>3000</span><span>2000</span><span>1000</span><span>0</span>
            </div>
            <svg
              class="h-[178px] min-w-0 flex-1 text-[#8023FF] dark:text-[#A684FF]"
              viewBox="0 0 720 178"
              preserveAspectRatio="none"
              role="img"
              :aria-label="t('dashboard.visitTrend')"
            >
              <path
                d="M0 12H720M0 60H720M0 108H720M0 156H720"
                stroke="currentColor"
                stroke-opacity="0.12"
                stroke-width="1"
              />
              <path
                d="M0 151C45 146 72 131 116 134S174 136 210 115S251 101 289 105S352 69 387 76S445 83 483 76S544 92 581 62S621 27 650 34S690 16 716 26"
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle cx="716" cy="26" r="4.5" fill="currentColor" />
            </svg>
          </div>
          <div
            class="ml-11 mt-2 flex justify-between text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]"
          >
            <span v-for="day in 7" :key="day">{{ t(`dashboard.day${day}`) }}</span>
          </div>
        </div>
      </section>

      <section
        class="min-w-0 rounded-[8px] border border-[#E8E9ED] bg-white p-4 dark:border-[#30313A] dark:bg-[#1B1C22]"
        :aria-label="t('dashboard.recentActivity')"
      >
        <div class="flex items-center justify-between gap-2">
          <div>
            <h2 class="text-sm font-semibold">{{ t('dashboard.recentActivity') }}</h2>
            <p class="mt-1 text-xs text-[#7B818B] dark:text-[#A1A1AA]">
              {{ t('dashboard.recentActivityHint') }}
            </p>
          </div>
          <button
            type="button"
            class="cursor-pointer text-xs text-[#5D0FC0] hover:underline dark:text-[#C5B3FF]"
            @click="showPending(t('dashboard.allActivity'))"
          >
            {{ t('dashboard.viewAll') }}
          </button>
        </div>
        <!-- AI modified: named sample activity rows match the prototype and are separated with a single quiet rule. -->
        <div class="mt-4">
          <div
            v-for="activity in activities"
            :key="activity.title"
            class="flex items-center gap-3 border-b border-[#E8E9ED] py-3 last:border-0 dark:border-[#30313A]"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F1E9FF] text-[13px] font-medium text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]"
              aria-hidden="true"
              >{{ activity.initial }}</span
            >
            <div class="min-w-0">
              <p class="truncate text-[12px] font-medium">{{ activity.title }}</p>
              <p class="mt-1 text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]">
                {{ activity.time }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <section
      class="mt-4 rounded-[8px] bg-[#F6F7F9] px-4 py-4 dark:bg-[#1B1C22]"
      :aria-label="t('dashboard.quickActions')"
    >
      <h2 class="text-sm font-semibold">{{ t('dashboard.quickActions') }}</h2>
      <p class="mt-1 text-xs text-[#7B818B] dark:text-[#A1A1AA]">
        {{ t('dashboard.quickActionsHint') }}
      </p>
      <div class="mt-3 grid gap-3 md:grid-cols-3">
        <RouterLink
          :to="{ name: 'users' }"
          class="flex min-w-0 cursor-pointer items-center gap-3 rounded-md py-2 text-left hover:text-[#8023FF] dark:hover:text-[#C5B3FF]"
        >
          <UserRoundPlus class="size-5 shrink-0 text-[#8023FF] dark:text-[#A684FF]" />
          <span class="min-w-0 flex-1"
            ><strong class="block text-[13px] font-medium">{{ t('dashboard.addUser') }}</strong
            ><small class="block truncate text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]">{{
              t('dashboard.addUserHint')
            }}</small></span
          >
          <ArrowUpRight class="size-4 shrink-0 text-[#A1A1AA]" />
        </RouterLink>
        <button
          type="button"
          class="flex min-w-0 cursor-pointer items-center gap-3 rounded-md py-2 text-left hover:text-[#8023FF] dark:hover:text-[#C5B3FF]"
          @click="showPending(t('dashboard.viewActivity'))"
        >
          <Activity class="size-5 shrink-0 text-[#8023FF] dark:text-[#A684FF]" />
          <span class="min-w-0 flex-1"
            ><strong class="block text-[13px] font-medium">{{ t('dashboard.viewActivity') }}</strong
            ><small class="block truncate text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]">{{
              t('dashboard.viewActivityHint')
            }}</small></span
          >
          <ArrowUpRight class="size-4 shrink-0 text-[#A1A1AA]" />
        </button>
        <button
          type="button"
          class="flex min-w-0 cursor-pointer items-center gap-3 rounded-md py-2 text-left hover:text-[#8023FF] dark:hover:text-[#C5B3FF]"
          @click="showPending(t('dashboard.permissions'))"
        >
          <ShieldCheck class="size-5 shrink-0 text-[#8023FF] dark:text-[#A684FF]" />
          <span class="min-w-0 flex-1"
            ><strong class="block text-[13px] font-medium">{{ t('dashboard.permissions') }}</strong
            ><small class="block truncate text-[11px] text-[#8A8F99] dark:text-[#A1A1AA]">{{
              t('dashboard.permissionsHint')
            }}</small></span
          >
          <ArrowUpRight class="size-4 shrink-0 text-[#A1A1AA]" />
        </button>
      </div>
    </section>
  </div>
</template>
