<template>
    <div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
      <div class="relative">
        <div class="bg-gray-800 text-white text-xs font-medium px-3 py-1 rounded shadow-lg">
        <slot/>
        </div>
        <!-- Tooltip oku -->
        <div class="absolute left-1/2 bottom-[-4px] transform -translate-x-1/2 w-0 h-0 border-t-4 border-t-gray-800 border-x-4 border-x-transparent"></div>
      </div>
    </div>
</template>

<script>
</script>
