<template>
  <div
    v-if="isCovered && !expanded"
    class="rp-animate-enter flex justify-center py-1"
  >
    <button
      type="button"
      class="rounded-full border border-white/[0.04] bg-white/[0.02] px-2.5 py-0.5 text-[10px] text-white/20 transition hover:text-white/45"
      @click="expanded = true"
    >
      Summarized
    </button>
  </div>

  <div
    v-else-if="isSummary"
    class="group relative rp-animate-enter"
  >
    <div class="rounded-lg border border-white/[0.04] bg-white/[0.015] px-4 py-2.5">
      <div class="flex items-center gap-2">
        <span class="rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/25">Summary</span>
        <p class="text-[13px] italic text-white/50">{{ content }}</p>
      </div>
    </div>
    <div v-if="messageId" class="absolute -top-1 right-0 flex gap-1 opacity-0 transition group-hover:opacity-100">
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-rose-300/70"
        title="Delete"
        @click="$emit('delete', messageId)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.3 4V2.7a.7.7 0 0 1 .7-.7h4a.7.7 0 0 1 .7.7V4m2 0v9.3a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V4"/><path d="M6 7v5M10 7v5"/></svg>
      </button>
    </div>
  </div>

  <div
    v-else-if="role === 'assistant'"
    class="group relative flex gap-3 rp-animate-enter"
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
      <div v-if="editing" class="mt-1.5">
        <textarea
          ref="editRef"
          v-model="editDraft"
          class="min-h-16 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white/80 outline-none transition focus:border-[var(--rp-accent)]/35"
          rows="3"
          @blur="saveEdit"
          @keydown.enter.prevent="saveEdit"
          @keydown.escape="cancelEdit"
        />
      </div>
      <div v-else class="rp-markdown mt-1.5 text-[15px] leading-7 text-white/88" v-html="renderedContent"></div>
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
      <div v-if="(attemptTotal ?? 0) > 1" class="mt-3 flex items-center gap-2 text-[11px] text-white/30">
        <button
          type="button"
          class="rounded px-1.5 py-0.5 transition hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-30"
          :disabled="!previousAttemptId"
          @click="previousAttemptId && $emit('selectAttempt', previousAttemptId)"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5 5.5 8l5 4.5"/></svg>
        </button>
        <span>Attempt {{ attemptPosition }} / {{ attemptTotal }}</span>
        <button
          type="button"
          class="rounded px-1.5 py-0.5 transition hover:bg-white/[0.04] hover:text-white/60 disabled:opacity-30"
          :disabled="!nextAttemptId"
          @click="nextAttemptId && $emit('selectAttempt', nextAttemptId)"
        >
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5.5 3.5 10.5 8l-5 4.5"/></svg>
        </button>
      </div>
    </div>
    <div v-if="messageId" class="absolute -top-1 right-0 flex gap-1 opacity-0 transition group-hover:opacity-100">
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/60"
        title="Edit"
        @click="startEdit"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3L5 14H2v-3z"/></svg>
      </button>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/60"
        title="Retry"
        @click="$emit('retry', messageId)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 4v4h4"/><path d="M3.5 12.5A6 6 0 1 0 3 4l2 4"/></svg>
      </button>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-rose-300/70"
        title="Delete"
        @click="$emit('delete', messageId)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.3 4V2.7a.7.7 0 0 1 .7-.7h4a.7.7 0 0 1 .7.7V4m2 0v9.3a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V4"/><path d="M6 7v5M10 7v5"/></svg>
      </button>
    </div>
  </div>

  <div
    v-else-if="role === 'user'"
    class="group relative flex justify-end rp-animate-enter"
  >
    <div class="max-w-[85%]">
      <p class="mb-1 text-right text-[13px] font-medium text-white/38">{{ userDisplayName }}</p>
      <div v-if="editing" class="rounded-2xl rounded-br-md bg-white/[0.04] px-4 py-3">
        <textarea
          ref="editRef"
          v-model="editDraft"
          class="min-h-16 w-full resize-none bg-transparent text-[15px] leading-7 text-white/80 outline-none"
          rows="3"
          @blur="saveEdit"
          @keydown.enter.prevent="saveEdit"
          @keydown.escape="cancelEdit"
        />
      </div>
      <div v-else class="rounded-2xl rounded-br-md bg-white/[0.04] px-4 py-3">
        <p class="whitespace-pre-wrap text-[15px] leading-7 text-white/88" v-html="renderedUserContent"></p>
      </div>
    </div>
    <div
      v-if="userAvatarUrl"
      class="ml-3 mt-0.5 h-9 w-9 shrink-0 overflow-hidden rounded-full"
    >
      <img :src="userAvatarUrl" alt="" class="h-full w-full object-cover" />
    </div>
    <div
      v-else
      class="ml-3 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
      :style="userAvatarStyle"
    >
      {{ userAvatarInitial }}
    </div>
    <div v-if="messageId" class="absolute -top-1 left-0 flex gap-1 opacity-0 transition group-hover:opacity-100">
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/60"
        title="Edit"
        @click="startEdit"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3L5 14H2v-3z"/></svg>
      </button>
      <button
        type="button"
        class="rounded px-1.5 py-0.5 text-[10px] text-white/25 transition hover:bg-white/[0.04] hover:text-rose-300/70"
        title="Delete"
        @click="$emit('delete', messageId)"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M5.3 4V2.7a.7.7 0 0 1 .7-.7h4a.7.7 0 0 1 .7.7V4m2 0v9.3a.7.7 0 0 1-.7.7H4a.7.7 0 0 1-.7-.7V4"/><path d="M6 7v5M10 7v5"/></svg>
      </button>
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
import DOMPurify from 'dompurify';
import { computed, nextTick, ref } from 'vue';

import { getApiBaseUrl } from '../lib/config';
import { highlightQuotes, renderMarkdown } from '../lib/markdown';

const props = defineProps<{
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  characterName?: string;
  characterAvatarPath?: string | null;
  attemptPosition?: number;
  attemptTotal?: number;
  previousAttemptId?: string | null;
  nextAttemptId?: string | null;
  userName?: string;
  userAvatarPath?: string | null;
  messageId?: string;
  isSummary?: boolean;
  isCovered?: boolean;
}>();

const emit = defineEmits<{
  delete: [messageId: string];
  edit: [messageId: string, content: string];
  retry: [messageId: string];
  selectAttempt: [messageId: string];
}>();

const reasoningOpen = ref(false);
const expanded = ref(false);
const editing = ref(false);
const editDraft = ref('');
const editRef = ref<HTMLTextAreaElement | null>(null);

function startEdit() {
  editDraft.value = props.content;
  editing.value = true;
  nextTick(() => editRef.value?.focus());
}

function saveEdit() {
  if (!editing.value || !props.messageId) return;
  const trimmed = editDraft.value.trim();
  if (trimmed && trimmed !== props.content) {
    emit('edit', props.messageId, trimmed);
  }
  editing.value = false;
}

function cancelEdit() {
  editing.value = false;
}

const hasReasoning = computed(() => Boolean(props.reasoning?.trim()));
const displayName = computed(() => props.characterName || 'Assistant');
const userDisplayName = computed(() => props.userName || 'You');
const avatarInitial = computed(() => {
  const name = props.characterName || 'A';
  return name.charAt(0).toUpperCase();
});
const userAvatarInitial = computed(() => userDisplayName.value.charAt(0).toUpperCase());
const avatarUrl = computed(() => {
  if (!props.characterAvatarPath) return null;
  return `${getApiBaseUrl()}/media/avatars/${props.characterAvatarPath.split(/[/\\]/).pop()}`;
});
const userAvatarUrl = computed(() => {
  if (!props.userAvatarPath) return null;
  return `${getApiBaseUrl()}/media/avatars/${props.userAvatarPath.split(/[/\\]/).pop()}`;
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
const userAvatarStyle = computed(() => {
  const name = userDisplayName.value;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = 210 + (Math.abs(hash) % 25);
  const sat = 22 + (Math.abs(hash >> 8) % 18);
  const lit = 30 + (Math.abs(hash >> 16) % 10);
  return {
    background: `hsl(${hue}, ${sat}%, ${lit}%)`,
    color: `hsl(${hue}, ${sat + 10}%, ${lit + 42}%)`,
  };
});
const renderedContent = computed(() => {
  if (!props.content) return '';
  return renderMarkdown(props.content);
});

const renderedUserContent = computed(() => {
  if (!props.content) return '';
  return DOMPurify.sanitize(highlightQuotes(props.content));
});
</script>
