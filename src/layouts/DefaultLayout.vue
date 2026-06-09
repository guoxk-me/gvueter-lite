<script setup lang="ts">
</script>

<template>
  <div class="flex min-h-screen flex-col bg-background text-foreground">
    <header class="sticky top-0 z-50 border-b border-secondary bg-background/80 backdrop-blur-sm">
      <div class="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <RouterLink to="/" class="text-lg font-bold">
          Gvueter
        </RouterLink>
        <nav class="flex items-center gap-6">
          <RouterLink to="/" class="text-sm transition hover:text-primary">
            Home
          </RouterLink>
          <RouterLink to="/about" class="text-sm transition hover:text-primary">
            About
          </RouterLink>
        </nav>
        <div class="flex items-center gap-2">
          <LanguageSwitch />
          <ColorModeSwitch />
        </div>
      </div>
    </header>
    <main class="flex-1">
      <RouterView />
    </main>
    <footer class="border-t border-secondary py-6 text-center text-sm text-muted-foreground">
      <p>Gvueter Lite &copy; 2026</p>
    </footer>
  </div>
</template>
