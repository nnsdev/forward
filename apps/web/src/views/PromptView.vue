<template>
  <main class="forward-shell min-h-screen px-3 py-3 text-slate-100 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
    <div class="forward-panel mx-auto max-w-6xl rounded-[2rem] p-6 backdrop-blur-xl sm:p-8">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-[0.32em] text-[rgba(221,176,135,0.78)]">Prompt inspector</p>
          <h1 class="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">Prompt assembly stays explicit</h1>
        </div>
        <RouterLink class="rounded-full border border-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-white/64 transition hover:border-[rgba(205,155,113,0.45)] hover:text-white" to="/">Back to chat</RouterLink>
      </div>

      <div v-if="loading" class="mt-6 rounded-[1.5rem] border border-white/7 bg-black/14 p-4 text-sm text-white/58">
        Loading prompt preview...
      </div>

      <div v-else-if="preview" class="mt-6">
        <div class="grid gap-4 md:grid-cols-3">
          <article class="rounded-[1.5rem] border border-white/7 bg-black/12 p-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/36">Provider</p>
            <p class="mt-2 text-sm text-white/92">{{ preview.provider.type }} / {{ preview.provider.model }}</p>
          </article>
          <article class="rounded-[1.5rem] border border-white/7 bg-black/12 p-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/36">Preset</p>
            <p class="mt-2 text-sm text-white/92">{{ preview.preset.name }}</p>
          </article>
          <article class="rounded-[1.5rem] border border-white/7 bg-black/12 p-4">
            <p class="text-[11px] uppercase tracking-[0.22em] text-white/36">Token estimate</p>
            <p class="mt-2 text-sm text-white/92">{{ preview.tokenEstimate }}</p>
          </article>
        </div>

        <article class="mt-4 rounded-2xl border p-4 text-sm"
          :class="preview.truncation.applied ? 'border-amber-500/40 bg-amber-500/10 text-amber-100' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'"
        >
          <p class="text-xs uppercase tracking-[0.25em]" :class="preview.truncation.applied ? 'text-amber-300' : 'text-emerald-300'">
            Truncation
          </p>
          <p class="mt-2 leading-6">
            {{ preview.truncation.applied ? `Applied. Dropped ${preview.truncation.droppedMessageIds.length} older message(s) to fit the prompt budget.` : 'Not applied. Full message history fit within the current prompt budget.' }}
          </p>
          <div v-if="preview.truncation.applied" class="mt-3 rounded-2xl border border-amber-500/20 bg-slate-950/50 p-3 text-xs text-amber-100/90">
            <p class="font-semibold text-amber-200">Dropped message IDs</p>
            <pre class="mt-2 overflow-x-auto whitespace-pre-wrap">{{ preview.truncation.droppedMessageIds.join('\n') }}</pre>
          </div>
        </article>

        <pre class="forward-scrollbar mt-6 overflow-x-auto rounded-[1.75rem] border border-white/7 bg-black/28 p-5 text-sm leading-7 text-white/74">{{ JSON.stringify(preview.messages, null, 2) }}</pre>
      </div>

      <p v-if="error" class="mt-4 text-sm text-rose-300">{{ error }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { PromptPreview } from '@forward/shared';
import { onMounted, ref } from 'vue';

import { api } from '../lib/api';
import { useChatStore } from '../stores/chat';

const error = ref('');
const loading = ref(false);
const preview = ref<PromptPreview | null>(null);
const chatStore = useChatStore();

onMounted(async () => {
  loading.value = true;
  error.value = '';

  try {
    await chatStore.initialize();

    if (!chatStore.activeChatId) {
      error.value = 'Create or select a chat to inspect its prompt.';
      return;
    }

    preview.value = await api.getPromptPreview(chatStore.activeChatId);
  } catch (nextError) {
    error.value = nextError instanceof Error ? nextError.message : 'Failed to load prompt preview';
  } finally {
    loading.value = false;
  }
});
</script>
