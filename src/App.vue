<script setup lang="ts">
// AI modified: this small page verifies the foundation without introducing business state.
const activationCount = shallowRef(0);
const feedback = computed(() =>
  activationCount.value === 0 ? '等待验证' : `已响应 ${activationCount.value} 次`,
);
</script>

<template>
  <main class="flex min-h-svh items-center justify-center bg-background px-6 py-12 text-foreground">
    <section
      class="flex w-full max-w-lg flex-col items-start gap-6"
      aria-labelledby="foundation-title"
    >
      <p class="text-sm font-medium tracking-wide text-muted-foreground">GVUETER LITE · PHASE 1</p>
      <div class="flex flex-col gap-3">
        <h1 id="foundation-title" class="text-3xl font-semibold tracking-tight">基础工程已就绪</h1>
        <p class="text-base leading-7 text-muted-foreground">
          这是基础验证页面。点击按钮，确认组件与交互正常运行。
        </p>
      </div>
      <Button type="button" @click="activationCount++">验证交互</Button>
      <p role="status" class="text-sm text-muted-foreground">{{ feedback }}</p>
    </section>
  </main>
</template>
