import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // AI modified: use shallowRef for primitive store state.
  const count = shallowRef(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
