<template>
  <div
    v-if="role === 'assistant'"
    class="flex gap-3 rp-animate-enter"
  >
    <div
      v-if="avatarUrl"
      class="mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full"
    >
      <img :src="avatarUrl" alt="" class="h-full w-full object-cover" />
    </div>
    <div
      v-else
      class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      :style="avatarStyle"
    >
      {{ avatarInitial }}
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-[13px] font-medium text-[var(--rp-accent)]">{{ displayName }}</p>
      <div class="rp-markdown mt-1.5 text-[15px] leading-7 text-white/88" v-html="renderedContent"></div>
      <section
        v-if="hasReasoning && reasoningOpen"
        class="mt-3 rounded-xl border border-white/5 bg-black/30 px-3.5 py-3 text-sm leading-6 text-white/60"
      >
        <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/30">Thinking</p>
        <p class="whitespace-pre-wrap">{{ reasoning }}</p>
      </section>
      <button
        v-if="hasReasoning"
        type="button"
        class="mt-2 text-[11px] uppercase tracking-[0.14em] text-white/30 transition hover:text-white/55"
        @click="reasoningOpen = !reasoningOpen"
      >
        {{ reasoningOpen ? 'Hide thinking' : 'Show thinking' }}
      </button>
    </div>
  </div>

  <div
    v-else-if="role === 'user'"
    class="flex justify-end rp-animate-enter"
  >
    <div class="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.04] px-4 py-3">
      <p class="whitespace-pre-wrap text-[15px] leading-7 text-white/88">{{ content }}</p>
    </div>
  </div>

  <div
    v-else
    class="rp-animate-enter py-2 text-center text-xs uppercase tracking-[0.2em] text-white/20"
  >
    {{ content }}
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import { getApiBaseUrl } from '../lib/config';
import { renderMarkdown } from '../lib/markdown';

interface Props {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  characterName?: string;
  characterAvatarPath?: string | null;
}

const props = defineProps<Props>();

const reasoningOpen = ref(false);

const hasReasoning = computed(() => Boolean(props.reasoning?.trim()));

const displayName = computed(() => props.characterName || 'Assistant');

const avatarInitial = computed(() => {
  const name = props.characterName || 'A';
  return name.charAt(0).toUpperCase();
});

const avatarUrl = computed(() => {
  if (!props.characterAvatarPath) return null;
  return `${getApiBaseUrl()}/media/avatars/${props.characterAvatarPath.split(/[/\\]/).pop()}`;
});

const avatarStyle = computed(() => {
  const name = props.characterName || 'Assistant';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = 170 + (Math.abs(hash) % 30);
  const sat = 25 + (Math.abs(hash >> 8) % 20);
  const lit = 28 + (Math.abs(hash >> 16) % 12);
  return {
    background: `hsl(${hue}, ${sat}%, ${lit}%)`,
    color: `hsl(${hue}, ${sat + 10}%, ${lit + 40}%)`,
  };
});

const renderedContent = computed(() => {
  if (!props.content) return '';
  return renderMarkdown(props.content);
});
</script>