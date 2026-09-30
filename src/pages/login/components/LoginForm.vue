<script setup lang="ts">
import type { LoginPayload } from '@/types/login/form'

import { ref } from 'vue'
import { ArrowUpRight, Eye, EyeOff, LoaderCircle, Lock, Mail } from '@lucide/vue'
import { useForm } from '@tanstack/vue-form'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { Checkbox } from '@/components/ui/checkbox'
// AI modified: shared pure types live in the centralized owner directory.

const props = defineProps<{ isSubmitting?: boolean }>()

const emits = defineEmits<{
  (e: 'submit', payload: LoginPayload): void
  (e: 'forgot-password'): void
  (e: 'contact-support'): void
}>()

// AI modified: TanStack Form owns login state; one validation source stays current on blur and input.
const { t } = useI18n()
const showPassword = ref(false)

function validateEmail(email: string): string | undefined {
  const emailSchema = z
    .string()
    .trim()
    .min(1, t('login.emailRequired'))
    .email(t('login.emailInvalid'))
  const validation = emailSchema.safeParse(email)
  return validation.success ? undefined : validation.error.issues[0]?.message
}

function validatePassword(password: string): string | undefined {
  const passwordSchema = z.string().min(1, t('login.passwordRequired'))
  const validation = passwordSchema.safeParse(password)
  return validation.success ? undefined : validation.error.issues[0]?.message
}

const form = useForm({
  defaultValues: { email: '', password: '', rememberMe: false },
  onSubmit: ({ value }) => {
    emits('submit', {
      email: value.email.trim(),
      password: value.password,
      rememberMe: value.rememberMe,
    })
  },
})
</script>

<template>
  <!-- AI modified: compact controls fit the default login state on a 1280×720 laptop viewport. -->
  <form class="space-y-4" @submit.prevent="form.handleSubmit" novalidate>
    <!-- AI modified: stronger resting borders make both fields identifiable before focus. -->
    <form.Field name="email" :validators="{ onChange: ({ value }) => validateEmail(value) }">
      <template #default="{ field }">
        <div
          class="space-y-2"
          :data-invalid="
            field.state.meta.errors.length > 0 &&
            (field.state.meta.isTouched || form.state.submissionAttempts > 0)
          "
        >
          <label
            for="work-email"
            class="block text-sm font-medium text-[#3E3348] dark:text-[#F0EAF5]"
          >
            {{ t('login.emailLabel') }}
          </label>
          <div
            class="relative flex h-12 w-full items-center rounded-[8px] border bg-[#FCFAFCEB] px-3.5 transition-all dark:bg-[#251D31E8]"
            :class="
              field.state.meta.errors.length > 0 &&
              (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                ? 'border-destructive ring-1 ring-destructive/40'
                : 'border-[#917D9D] dark:border-[#7F6F8D] focus-within:border-[#8023FF] focus-within:ring-2 focus-within:ring-[#8023FF]/20 dark:focus-within:border-[#A684FF] dark:focus-within:ring-[#A684FF]/20'
            "
          >
            <Mail class="size-[18px] shrink-0 text-[#95869E] dark:text-[#BBACC8]" />
            <input
              id="work-email"
              :name="field.name"
              :value="field.state.value"
              :aria-invalid="
                field.state.meta.errors.length > 0 &&
                (field.state.meta.isTouched || form.state.submissionAttempts > 0)
              "
              type="email"
              autocomplete="username email"
              :placeholder="t('login.emailPlaceholder')"
              class="h-full w-full bg-transparent pl-3 pr-2 text-sm text-[#3E3348] placeholder-[#A297A9] outline-none dark:text-[#F0EAF5] dark:placeholder-[#BBAEC6]"
              @blur="
                () => {
                  field.handleBlur()
                  field.validate('change')
                }
              "
              @input="field.handleChange(($event.target as HTMLInputElement).value)"
            />
          </div>
          <p
            v-if="
              field.state.meta.errors.length > 0 &&
              (field.state.meta.isTouched || form.state.submissionAttempts > 0)
            "
            class="text-xs text-destructive"
          >
            {{ field.state.meta.errors[0] }}
          </p>
        </div>
      </template>
    </form.Field>

    <!-- Password field -->
    <form.Field name="password" :validators="{ onChange: ({ value }) => validatePassword(value) }">
      <template #default="{ field }">
        <div
          class="space-y-2"
          :data-invalid="
            field.state.meta.errors.length > 0 &&
            (field.state.meta.isTouched || form.state.submissionAttempts > 0)
          "
        >
          <label
            for="password"
            class="block text-sm font-medium text-[#3E3348] dark:text-[#F0EAF5]"
          >
            {{ t('login.passwordLabel') }}
          </label>
          <div
            class="relative flex h-12 w-full items-center rounded-[8px] border bg-[#FCFAFCEB] px-3.5 transition-all dark:bg-[#251D31E8]"
            :class="
              field.state.meta.errors.length > 0 &&
              (field.state.meta.isTouched || form.state.submissionAttempts > 0)
                ? 'border-destructive ring-1 ring-destructive/40'
                : 'border-[#917D9D] dark:border-[#7F6F8D] focus-within:border-[#8023FF] focus-within:ring-2 focus-within:ring-[#8023FF]/20 dark:focus-within:border-[#A684FF] dark:focus-within:ring-[#A684FF]/20'
            "
          >
            <Lock class="size-[18px] shrink-0 text-[#95869E] dark:text-[#BBACC8]" />
            <input
              id="password"
              :name="field.name"
              :value="field.state.value"
              :aria-invalid="
                field.state.meta.errors.length > 0 &&
                (field.state.meta.isTouched || form.state.submissionAttempts > 0)
              "
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              :placeholder="t('login.passwordPlaceholder')"
              class="h-full w-full bg-transparent pl-3 pr-2 text-sm text-[#3E3348] placeholder-[#A297A9] outline-none dark:text-[#F0EAF5] dark:placeholder-[#BBAEC6]"
              @blur="
                () => {
                  field.handleBlur()
                  field.validate('change')
                }
              "
              @input="field.handleChange(($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              :aria-label="showPassword ? t('login.hidePassword') : t('login.showPassword')"
              class="flex size-7 shrink-0 cursor-pointer items-center justify-center text-[#A297A9] transition-colors hover:text-[#574662] focus-visible:outline-none dark:text-[#BBACC8] dark:hover:text-[#F3EAFB]"
              @click="showPassword = !showPassword"
            >
              <EyeOff v-if="showPassword" class="size-[18px]" />
              <Eye v-else class="size-[18px]" />
            </button>
          </div>
          <p
            v-if="
              field.state.meta.errors.length > 0 &&
              (field.state.meta.isTouched || form.state.submissionAttempts > 0)
            "
            class="text-xs text-destructive"
          >
            {{ field.state.meta.errors[0] }}
          </p>
        </div>
      </template>
    </form.Field>

    <!-- Options row: Remember me & Forgot password -->
    <div class="flex items-center justify-between pt-1">
      <form.Field name="rememberMe">
        <template #default="{ field }">
          <label class="flex cursor-pointer select-none items-center gap-2.5">
            <Checkbox
              :model-value="field.state.value"
              class="size-[19px] rounded-[5px] border-[#CFC0DB] bg-[#FCFAFCEB] data-[state=checked]:border-[#8023FF] data-[state=checked]:bg-[#8023FF] data-[state=checked]:text-white dark:border-[#6C5B7A] dark:bg-[#251D31E8] dark:data-[state=checked]:border-[#A684FF] dark:data-[state=checked]:bg-[#A684FF] dark:data-[state=checked]:text-[#2F0D68]"
              @update:model-value="(checked) => field.handleChange(checked === true)"
            />
            <span class="text-sm text-[#685D71] dark:text-[#E3D9EA]">
              {{ t('login.rememberMe') }}
            </span>
          </label>
        </template>
      </form.Field>

      <button
        type="button"
        class="cursor-pointer text-sm font-medium text-[#5D0FC0] transition-opacity hover:opacity-80 dark:text-[#C5B3FF]"
        @click="emits('forgot-password')"
      >
        {{ t('login.forgotPassword') }}
      </button>
    </div>

    <!-- Submit button -->
    <button
      type="submit"
      :disabled="props.isSubmitting"
      :aria-busy="props.isSubmitting"
      class="relative flex h-12 w-full cursor-pointer items-center justify-center rounded-[8px] bg-[#8023FF] px-6 text-sm font-medium text-white transition-colors hover:bg-[#7107E7] disabled:cursor-wait disabled:opacity-75 dark:bg-[#A684FF] dark:text-[#2F0D68] dark:hover:bg-[#B396FF]"
    >
      <span>{{ t('login.submit') }}</span>
      <LoaderCircle v-if="props.isSubmitting" class="absolute right-4 size-[18px] animate-spin" />
      <ArrowUpRight v-else class="absolute right-4 size-[18px]" />
    </button>

    <!-- Bottom note & support link -->
    <div class="space-y-1 pt-1 text-xs">
      <p class="text-[#82768A] dark:text-[#C9BFD2]">
        {{ t('login.securityNote') }}
      </p>
      <div>
        <button
          type="button"
          class="cursor-pointer text-left text-[#685D72] underline-offset-4 hover:underline dark:text-[#E6DBED]"
          @click="emits('contact-support')"
        >
          {{ t('login.supportLink') }}
        </button>
      </div>
    </div>
  </form>
</template>
