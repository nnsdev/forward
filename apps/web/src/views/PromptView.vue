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

      <div v-if="!chatStore.activeChatId" class="mt-6 rounded-[1.5rem] border border-white/7 bg-black/14 p-6 text-center text-sm text-white/50">
        Select a chat to inspect its prompt.
      </div>

      <div v-else-if="loading" class="mt-6 rounded-[1.5rem] border border-white/7 bg-black/14 p-4 text-sm text-white/58">
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
            <p class="mt-1 text-[11px] leading-5 text-white/35">
              template {{ preview.templateName }}<br>
              temp {{ preview.preset.temperature }} &middot; top_p {{ preview.preset.topP }} &middot; top_k {{ preview.preset.topK }} &middot; min_p {{ preview.preset.minP }}<br>
              ctx {{ preview.preset.contextLength }} &middot; max {{ preview.preset.maxOutputTokens }} &middot; rep {{ preview.preset.repeatPenalty }} &middot; freq {{ preview.preset.frequencyPenalty }} &middot; pres {{ preview.preset.presencePenalty }}<span v-if="preview.preset.thinkingBudgetTokens !== null"> &middot; think {{ preview.preset.thinkingBudgetTokens }}</span><br>
              <template v-if="preview.preset.seed !== null">seed {{ preview.preset.seed }}</template><template v-else>seed random</template>
            </p>
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
        </article>

        <article class="mt-4 rounded-2xl border border-white/7 bg-black/12 p-4">
          <p class="text-[11px] uppercase tracking-[0.22em] text-white/36">Formatted Prompt</p>
          <pre class="mt-3 whitespace-pre-wrap text-xs leading-6 text-white/72">{{ preview.formattedPrompt }}</pre>
        </article>

        <div class="mt-6 space-y-3">
          <div
            v-for="(message, index) in preview.messages"
            :key="index"
            class="rounded-xl border border-white/7 bg-black/12 p-4"
          >
            <div class="mb-1 flex items-center gap-2">
              <span
                class="rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                :class="roleTagClass(message.role)"
              >
                {{ message.role }}
              </span>
              <span class="text-[10px] text-white/20">#{{ index + 1 }}</span>
            </div>
            <p class="whitespace-pre-wrap text-sm leading-6 text-white/74">{{ message.content }}</p>
          </div>
        </div>
      </div>

      <p v-if="error" class="mt-4 text-sm text-rose-300">{{ error }}</p>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { PromptPreview } from '@forward/shared';
import { onMounted, ref, watch } from 'vue';

import { api } from '../lib/api';
import { useChatStore } from '../stores/chat';

const error = ref('');
const loading = ref(false);
const preview = ref<PromptPreview | null>(null);
const chatStore = useChatStore();

function roleTagClass(role: string): string {
  if (role === 'system') return 'bg-teal-500/15 text-teal-300';
  if (role === 'user') return 'bg-blue-500/15 text-blue-300';
  return 'bg-purple-500/15 text-purple-300';
}

async function loadPreview() {
  if (!chatStore.activeChatId) {
    preview.value = null;
    return;
  }

  loading.value = true;
  error.value = '';

  try {
    preview.value = await api.getPromptPreview(chatStore.activeChatId);
  } catch (nextError) {
    error.value = nextError instanceof Error ? nextError.message : 'Failed to load prompt preview';
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await chatStore.initialize();
  await loadPreview();
});

watch(() => chatStore.activeChatId, () => {
  loadPreview();
});
</script>
