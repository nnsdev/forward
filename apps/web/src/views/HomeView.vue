<template>
  <div class="flex h-dvh bg-[var(--rp-bg)]">
    <aside
      :class="sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'"
      class="fixed inset-y-0 left-0 z-30 w-60 flex-col border-r border-white/5 bg-[var(--rp-bg)] transition-transform duration-200 lg:relative lg:z-auto lg:flex"
    >
      <div class="flex h-12 items-center justify-between border-b border-white/5 px-4">
        <p class="text-[11px] font-semibold uppercase tracking-[0.34em] text-[var(--rp-accent)]">Forward</p>
        <button class="text-white/30 hover:text-white/60 lg:hidden" type="button" @click="sidebarOpen = false">&times;</button>
      </div>

      <div class="p-2.5">
        <button
          class="w-full rounded-lg bg-[var(--rp-accent)] px-3 py-2 text-sm font-medium text-[#0a1212] transition hover:brightness-110"
          @click="createChat"
        >
          New chat
        </button>
      </div>

      <div class="rp-scrollbar flex-1 overflow-y-auto px-2">
        <button
          v-for="chat in chatStore.chats"
          :key="chat.id"
          class="mb-0.5 w-full rounded-lg px-3 py-2 text-left text-sm transition"
          :class="chat.id === chatStore.activeChatId ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:bg-white/[0.03] hover:text-white/75'"
          @click="chatStore.selectChat(chat.id)"
        >
          <p class="truncate font-medium">{{ chat.title }}</p>
        </button>
        <div v-if="!chatStore.chats.length" class="px-3 py-8 text-center text-xs text-white/20">
          No conversations yet
        </div>
      </div>

      <div class="border-t border-white/5 p-2.5 space-y-0.5">
        <RouterLink
          class="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          to="/prompt"
        >
          Prompt inspector
        </RouterLink>
        <button
          class="w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          @click="logout"
        >
          Sign out
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-12 shrink-0 items-center gap-3 border-b border-white/5 px-4">
        <button class="text-white/40 hover:text-white/70 lg:hidden" type="button" @click="sidebarOpen = true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>

        <div v-if="chatStore.activeCharacter" class="flex items-center gap-2.5">
          <div
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
            :style="characterAvatarStyle"
          >
            {{ chatStore.activeCharacter.name.charAt(0).toUpperCase() }}
          </div>
          <div>
            <p class="text-sm font-medium text-white/85">{{ chatStore.activeCharacter.name }}</p>
            <p class="text-[10px] text-white/25">{{ chatStore.activePreset?.name ?? 'Default preset' }}</p>
          </div>
        </div>
        <div v-else class="flex items-center gap-2.5">
          <div class="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-[10px] text-white/25">?</div>
          <p class="text-sm text-white/40">No character</p>
        </div>

        <div class="ml-auto">
          <button
            v-if="chatStore.activeCharacter"
            class="rounded-lg px-3 py-1.5 text-[11px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/55"
            @click="characterPanelOpen = !characterPanelOpen"
          >
            {{ characterPanelOpen ? 'Hide' : 'Character' }}
          </button>
          <button
            v-else
            class="rounded-lg px-3 py-1.5 text-[11px] text-[var(--rp-accent)]/60 transition hover:bg-white/[0.04] hover:text-[var(--rp-accent)]"
            @click="characterPanelOpen = !characterPanelOpen"
          >
            + Character
          </button>
        </div>
      </header>

      <div class="rp-scrollbar relative flex-1 overflow-y-auto">
        <div v-if="chatStore.loading" class="flex h-full items-center justify-center text-sm text-white/25">
          Loading...
        </div>

        <div v-else-if="!chatStore.activeChatId && !chatStore.chats.length" class="flex h-full flex-col items-center justify-center gap-4 px-6">
          <div class="flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.02] text-xl text-white/10">F</div>
          <p class="text-sm text-white/25">Start a conversation to begin</p>
          <button
            class="rounded-lg bg-[var(--rp-accent)] px-4 py-2 text-sm font-medium text-[#0a1212] transition hover:brightness-110"
            @click="createChat"
          >
            New chat
          </button>
        </div>

        <div v-else-if="!chatStore.activeMessages.length" class="flex h-full flex-col items-center justify-center px-8">
          <div v-if="chatStore.activeCharacter" class="flex max-w-xl flex-col items-center gap-3 text-center">
            <div
              class="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-semibold"
              :style="characterAvatarStyle"
            >
              {{ chatStore.activeCharacter.name.charAt(0).toUpperCase() }}
            </div>
            <p class="text-lg font-medium text-white/80">{{ chatStore.activeCharacter.name }}</p>
            <p class="text-sm text-white/30">{{ chatStore.activeCharacter.description || chatStore.activeCharacter.personality || 'A character ready to talk.' }}</p>
            <p v-if="chatStore.activeCharacter.firstMessage" class="mt-6 w-full rounded-xl bg-white/[0.025] px-6 py-5 text-left text-[15px] leading-7 text-white/70 rp-animate-fade">
              {{ chatStore.activeCharacter.firstMessage }}
            </p>
          </div>
          <p v-else class="text-sm text-white/25">Attach a character or type a message below.</p>
        </div>

        <div v-else class="px-6 py-5 lg:px-10">
          <div class="space-y-5">
            <MessageCard
              v-for="message in chatStore.activeMessages"
              :key="message.id"
              :content="message.content || (message.role === 'assistant' && message.reasoningContent ? 'Reasoning only response' : '')"
              :reasoning="message.reasoningContent"
              :role="message.role"
              :character-name="message.role === 'assistant' ? chatStore.activeCharacter?.name : undefined"
              :character-avatar-path="message.role === 'assistant' ? chatStore.activeCharacter?.avatarAssetPath : undefined"
            />
          </div>
          <div v-if="chatStore.generating" class="mt-4 flex items-center gap-2 text-xs text-white/20">
            <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--rp-accent)]"></span>
            Writing...
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-white/5 bg-[var(--rp-bg)]">
        <form class="flex items-end gap-3 px-6 py-3 lg:px-10" @submit.prevent="submitMessage">
          <textarea
            id="composer"
            ref="composerRef"
            v-model="composer"
            class="rp-scrollbar min-h-11 max-h-40 flex-1 resize-none rounded-lg border border-white/6 bg-white/[0.02] px-4 py-3 text-[15px] leading-6 text-white/80 outline-none transition focus:border-[var(--rp-accent)]/35 focus:bg-white/[0.03]"
            placeholder="Write a message..."
            rows="1"
            @input="autoResize"
            @keydown.enter.exact.prevent="submitMessage"
          />
          <button
            class="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--rp-accent)] text-[#0a1212] transition hover:brightness-110 disabled:opacity-35"
            :disabled="chatStore.generating || !composer.trim()"
            type="submit"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none"><path d="M2 9l14-7-7 14v-7H2z" fill="currentColor"/></svg>
          </button>
        </form>
      </div>
    </div>

    <aside
      v-if="characterPanelOpen"
      class="rp-animate-fade w-64 shrink-0 overflow-hidden border-l border-white/5 bg-[var(--rp-bg)] lg:w-72"
    >
      <div class="rp-scrollbar flex h-full flex-col overflow-y-auto">
        <div class="border-b border-white/5 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">Characters</p>
        </div>

        <div class="p-4 space-y-3">
          <form class="space-y-2" @submit.prevent="saveCharacter">
            <input
              v-model="characterForm.name"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Character name"
            />
            <textarea
              v-model="characterForm.description"
              class="min-h-20 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Description or role instructions"
            />
            <div class="flex gap-2">
              <button class="flex-1 rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white" type="submit">
                {{ editingCharacterId ? 'Save' : 'Create' }}
              </button>
              <button
                v-if="editingCharacterId"
                class="rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/35 transition hover:text-white/60"
                type="button"
                @click="resetCharacterForm"
              >
                Cancel
              </button>
            </div>
          </form>

          <label class="flex cursor-pointer items-center justify-center rounded-lg border border-white/8 px-3 py-2 text-sm text-white/40 transition hover:bg-white/[0.03] hover:text-white/70">
            Import character
            <input class="hidden" type="file" accept=".json,image/png" @change="importCharacter" />
          </label>

          <div class="space-y-1">
            <article
              v-for="character in chatStore.characters"
              :key="character.id"
              class="rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
            >
              <p class="text-sm font-medium text-white/75">{{ character.name }}</p>
              <p class="mt-0.5 line-clamp-2 text-xs text-white/25">{{ character.description || character.personality || 'No details.' }}</p>
              <div class="mt-2 flex gap-1.5">
                <button
                  class="rounded px-2 py-0.5 text-[11px] transition hover:text-white/60"
                  :class="chatStore.activeCharacter?.id === character.id ? 'text-[var(--rp-accent)]' : 'text-white/30'"
                  type="button"
                  @click.stop="attachCharacter(character.id)"
                >
                  {{ chatStore.activeCharacter?.id === character.id ? 'Active' : 'Attach' }}
                </button>
                <button class="rounded px-2 py-0.5 text-[11px] text-white/25 transition hover:text-white/50" type="button" @click.stop="editCharacter(character.id)">
                  Edit
                </button>
                <button class="rounded px-2 py-0.5 text-[11px] text-rose-300/40 transition hover:text-rose-300/80" type="button" @click.stop="removeCharacter(character.id)">
                  Delete
                </button>
              </div>
            </article>
            <button
              v-if="chatStore.activeCharacter"
              class="w-full rounded-lg px-3 py-2 text-xs text-white/25 transition hover:bg-white/[0.03] hover:text-white/50"
              @click="attachCharacter(null)"
            >
              Remove character
            </button>
          </div>
        </div>
      </div>
    </aside>
  </div>

  <p v-if="chatStore.error" class="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-300/80 rp-animate-fade">
    {{ chatStore.error }}
  </p>
</template>

<script setup lang="ts">
import type { CreateCharacterInput, CreatePresetInput } from '@forward/shared';
import { reactive, onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';

import MessageCard from '../components/MessageCard.vue';
import { useChatStore } from '../stores/chat';
import { useSessionStore } from '../stores/session';

const chatStore = useChatStore();
const characterPanelOpen = ref(false);
const composer = ref('');
const composerRef = ref<HTMLTextAreaElement | null>(null);
const editingCharacterId = ref<string | null>(null);
const sidebarOpen = ref(false);
const characterForm = reactive<CreateCharacterInput>({
  avatarAssetPath: null,
  description: '',
  exampleDialogue: '',
  firstMessage: '',
  name: '',
  personality: '',
  scenario: '',
});
const router = useRouter();
const sessionStore = useSessionStore();

const characterAvatarStyle = computed(() => {
  const name = chatStore.activeCharacter?.name || 'A';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = 170 + (Math.abs(hash) % 30);
  const sat = 25 + (Math.abs(hash >> 8) % 20);
  const lit = 28 + (Math.abs(hash >> 16) % 12);
  return {
    background: `hsl(${hue}, ${sat}%, ${lit}%)`,
    color: `hsl(${hue}, ${sat + 15}%, ${lit + 42}%)`,
  };
});

onMounted(async () => {
  await chatStore.initialize();
});

function autoResize() {
  const el = composerRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

async function createChat() {
  await chatStore.ensureChat();
}

function resetCharacterForm() {
  editingCharacterId.value = null;
  characterForm.name = '';
  characterForm.description = '';
  characterForm.personality = '';
  characterForm.scenario = '';
  characterForm.firstMessage = '';
  characterForm.exampleDialogue = '';
}

function editCharacter(characterId: string) {
  const character = chatStore.characters.find((c) => c.id === characterId);
  if (!character) return;
  editingCharacterId.value = character.id;
  characterPanelOpen.value = true;
  characterForm.name = character.name;
  characterForm.description = character.description;
  characterForm.personality = character.personality;
  characterForm.scenario = character.scenario;
  characterForm.firstMessage = character.firstMessage;
  characterForm.exampleDialogue = character.exampleDialogue;
}

async function saveCharacter() {
  if (!characterForm.name.trim()) return;
  const payload = { ...characterForm, name: characterForm.name.trim() };
  if (editingCharacterId.value) {
    await chatStore.updateCharacter(editingCharacterId.value, payload);
  } else {
    await chatStore.createCharacter(payload);
  }
  resetCharacterForm();
}

async function importCharacter(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await chatStore.importCharacter(file);
  input.value = '';
}

async function attachCharacter(characterId: string | null) {
  await chatStore.ensureChat();
  await chatStore.assignCharacterToActiveChat(characterId);
}

async function removeCharacter(characterId: string) {
  if (editingCharacterId.value === characterId) resetCharacterForm();
  await chatStore.deleteCharacter(characterId);
}

async function logout() {
  await sessionStore.logout();
  await router.push('/login');
}

async function submitMessage() {
  const nextMessage = composer.value.trim();
  if (!nextMessage) return;
  composer.value = '';
  if (composerRef.value) composerRef.value.style.height = 'auto';
  await chatStore.sendMessage(nextMessage);
}
</script>
