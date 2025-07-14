<template>
  <button
      @click="efect"
      ref="buttonEl"
      class="p-2 rounded-lg text-sm font-medium transition-all shadow-sm"
      :class="cls"
  >
    <slot></slot>
  </button>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  cls: {
    type: String,
    default: 'temizle'
  }
})

const buttonEl = ref(null)

function efect() {
  if (buttonEl.value) {
    // Butonu 10px yukarı kaldır
    buttonEl.value.style.transform = 'translateY(-10px)'
    // 300ms sonra eski haline dönsün
    setTimeout(() => {
      buttonEl.value.style.transform = ''
    }, 300)
  }
}
</script>


<style>.temizle {
  @apply bg-red-600 hover:bg-red-700; /* Güncellendi */
}

.divit {
  @apply bg-orange-600 hover:bg-orange-700; /* Güncellendi */
}

.silgi {
  @apply bg-yellow-500 hover:bg-yellow-600; /* Güncellendi */
}

.not {
  @apply bg-yellow-400 hover:bg-yellow-500; /* Güncellendi */
}

.boyut {
  @apply bg-green-500 hover:bg-green-600; /* Güncellendi */
}

.temizSayfa {
  @apply bg-green-600 hover:bg-green-700; /* Güncellendi */
}

.ayrac {
  @apply bg-teal-600 hover:bg-teal-700; /* Güncellendi */
}

.panel {
  @apply bg-cyan-600 hover:bg-cyan-700; /* Güncellendi */
}

.dil {
  @apply bg-sky-600 hover:bg-sky-700; /* Güncellendi */
}

.dahaFazla {
  @apply bg-blue-600 hover:bg-blue-700; /* Güncellendi */
}

.gizle {
  @apply bg-indigo-600 hover:bg-indigo-700; /* Güncellendi */
}

.ayraclar {
  @apply bg-purple-600 hover:bg-purple-700; /* Güncellendi */
}

</style>
