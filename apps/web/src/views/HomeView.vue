<template>
  <div class="flex h-dvh bg-[var(--rp-bg)]" @touchstart.passive="scrollContainer?.focus()">
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
          class="group mb-0.5 w-full rounded-lg px-3 py-2 text-left text-sm transition"
          :class="chat.id === chatStore.activeChatId ? 'bg-white/[0.06] text-white' : 'text-white/45 hover:bg-white/[0.03] hover:text-white/75'"
          @click="chatStore.selectChat(chat.id)"
        >
          <div v-if="renamingChatId === chat.id" class="flex items-center gap-1.5" @click.stop>
            <input
              ref="renameInputRef"
              v-model="renameTitle"
              class="min-w-0 flex-1 rounded border border-[var(--rp-accent)]/30 bg-white/[0.02] px-1.5 py-0.5 text-sm text-white outline-none"
              @keydown.enter="saveRename(chat.id)"
              @keydown.escape="cancelRename"
              @blur="saveRename(chat.id)"
            />
          </div>
          <div v-else class="flex items-center gap-1.5">
            <p class="truncate font-medium flex-1">{{ chat.title }}</p>
            <button
              class="hidden shrink-0 text-[10px] text-white/20 hover:text-white/50 group-hover:inline"
              type="button"
              title="Rename"
              @click.stop="startRename(chat.id, chat.title)"
            >
              <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 2l3 3L5 14H2v-3z"/></svg>
            </button>
            <button
              class="hidden shrink-0 text-[10px] text-white/20 hover:text-rose-300/60 group-hover:inline"
              type="button"
              title="Delete"
              @click.stop="confirmDeleteChat(chat.id)"
            >
              &times;
            </button>
          </div>
        </button>
        <div v-if="!chatStore.chats.length" class="px-3 py-8 text-center text-xs text-white/20">
          No conversations yet
        </div>
      </div>

      <div class="border-t border-white/5 p-2.5 space-y-0.5">
        <button
          class="w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          @click="providerPanelOpen = !providerPanelOpen"
        >
          Providers
        </button>
        <button
          class="w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          @click="presetPanelOpen = !presetPanelOpen"
        >
          Presets
        </button>
        <button
          class="w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          @click="showPersonaEditor = true"
        >
          Persona
        </button>
        <RouterLink
          class="block w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          to="/prompt"
        >
          Prompt inspector
        </RouterLink>
        <button
          class="w-full rounded-lg px-3 py-2 text-left text-sm text-white/35 transition hover:bg-white/[0.03] hover:text-white/65"
          @click="showPasswordChange = true"
        >
          Change password
        </button>
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
            v-if="characterAvatarUrl"
            class="h-7 w-7 shrink-0 overflow-hidden rounded-full"
          >
            <img :src="characterAvatarUrl" alt="" class="h-full w-full object-cover" />
          </div>
          <div
            v-else
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

        <div class="ml-auto flex items-center gap-1">
          <button
            class="rounded-lg px-3 py-1.5 text-[11px] text-white/25 transition hover:bg-white/[0.04] hover:text-white/55"
            @click="characterPanelOpen = !characterPanelOpen"
          >
            {{ characterPanelOpen ? 'Hide' : 'Character' }}
          </button>
        </div>
      </header>

      <div ref="scrollContainer" class="rp-scrollbar relative flex-1 overflow-y-auto">
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
            <img
              v-if="characterAvatarUrl"
              :src="characterAvatarUrl"
              alt=""
              class="h-20 w-20 rounded-full object-cover"
            />
            <div
              v-else
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
              v-for="entry in displayMessages"
              :key="entry.message.id"
              :content="entry.message.content || (entry.message.role === 'assistant' && entry.message.reasoningContent ? 'Reasoning only response' : '')"
              :reasoning="entry.message.reasoningContent"
              :role="entry.message.role"
              :message-id="entry.message.id"
              :attempt-position="entry.attemptPosition"
              :attempt-total="entry.attemptTotal"
              :previous-attempt-id="entry.previousAttemptId"
              :next-attempt-id="entry.nextAttemptId"
              :character-name="entry.message.role === 'assistant' ? chatStore.activeCharacter?.name : undefined"
              :character-avatar-path="entry.message.role === 'assistant' ? chatStore.activeCharacter?.avatarAssetPath : undefined"
              :user-name="entry.message.role === 'user' ? chatStore.appSettings?.personaName : undefined"
              :user-avatar-path="entry.message.role === 'user' ? chatStore.appSettings?.personaAvatarAssetPath : undefined"
              :is-summary="entry.message.summaryOf.length > 0"
              :is-covered="coveredMessageIds.has(entry.message.id)"
              @retry="handleRetry"
              @delete="handleDeleteMessage"
              @select-attempt="handleSelectAttempt"
              @edit="handleEditMessage"
            />
          </div>
          <div v-if="chatStore.generating" class="mt-4 flex items-center gap-2 text-xs text-white/20">
            <span class="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--rp-accent)]"></span>
            Writing...
            <button
              class="ml-1 rounded border border-white/10 px-2 py-0.5 text-[10px] text-white/30 transition hover:border-white/20 hover:text-white/50"
              type="button"
              @click="chatStore.cancelGeneration()"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div class="shrink-0 border-t border-white/5 bg-[var(--rp-bg)]">
        <div class="px-6 pt-2 lg:px-10">
          <button
            type="button"
            class="text-[11px] text-white/20 transition hover:text-white/50"
            @click="authorNoteOpen = !authorNoteOpen"
          >
            {{ authorNoteOpen ? 'Hide' : "Author's note" }}
            <span v-if="chatStore.activeChat?.authorNote" class="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-[var(--rp-accent)]" />
          </button>
          <div v-if="authorNoteOpen" class="mt-1.5">
            <textarea
              v-model="authorNoteDraft"
              class="min-h-16 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white/80 outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Instructions specific to this chat..."
              rows="2"
              @blur="saveAuthorNote"
              @keydown.enter.prevent="saveAuthorNote"
            />
          </div>
        </div>
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
            v-if="!chatStore.generating"
            aria-label="Continue response"
            class="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/45 transition hover:bg-white/[0.04] hover:text-white/70 disabled:opacity-35"
            :disabled="!canContinue"
            title="Continue"
            type="button"
            @click="chatStore.continueGeneration()"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2.5 8h8" />
              <path d="M7.5 4.5 11 8l-3.5 3.5" />
              <path d="M11 4.5h2.5v7H11" />
            </svg>
          </button>
          <button
            v-if="chatStore.generating"
            class="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-rose-400/30 text-rose-300/70 transition hover:border-rose-400/50 hover:text-rose-300"
            type="button"
            @click="chatStore.cancelGeneration()"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect width="14" height="14" rx="2" fill="currentColor"/></svg>
          </button>
          <button
            v-else
            class="mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[var(--rp-accent)] text-[#0a1212] transition hover:brightness-110 disabled:opacity-35"
            :disabled="!composer.trim()"
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
        <div class="flex h-12 items-center justify-between border-b border-white/5 px-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">Characters</p>
          <button class="text-white/25 hover:text-white/50" type="button" @click="characterPanelOpen = false">&times;</button>
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
              class="min-h-16 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Description"
            />
            <textarea
              v-model="characterForm.personality"
              class="min-h-14 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Personality traits"
            />
            <textarea
              v-model="characterForm.scenario"
              class="min-h-14 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Scenario / setting"
            />
            <textarea
              v-model="characterForm.firstMessage"
              class="min-h-14 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="First message (greeting)"
            />
            <textarea
              v-model="characterForm.exampleDialogue"
              class="min-h-14 w-full resize-none rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Example dialogue"
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
              <div class="flex items-center gap-2">
                <img
                  v-if="character.avatarAssetPath"
                  :src="avatarUrlFor(character.avatarAssetPath)"
                  alt=""
                  class="h-6 w-6 shrink-0 rounded-full object-cover"
                />
                <div
                  v-else
                  class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
                  :style="avatarStyleForName(character.name)"
                >
                  {{ character.name.charAt(0).toUpperCase() }}
                </div>
                <p class="truncate text-sm font-medium text-white/75">{{ character.name }}</p>
              </div>
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

    <aside
      v-if="presetPanelOpen"
      class="rp-animate-fade w-64 shrink-0 overflow-hidden border-l border-white/5 bg-[var(--rp-bg)] lg:w-72"
    >
      <div class="rp-scrollbar flex h-full flex-col overflow-y-auto">
        <div class="flex h-12 items-center justify-between border-b border-white/5 px-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">Presets</p>
          <button class="text-white/25 hover:text-white/50" type="button" @click="presetPanelOpen = false">&times;</button>
        </div>

        <div class="p-4 space-y-3">
          <form class="space-y-2" @submit.prevent="savePreset">
            <input
              v-model="presetForm.name"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Preset name"
            />
            <div>
              <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Template</label>
              <select
                v-model="selectedTemplateName"
                class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                @change="applySelectedTemplate"
              >
                <option value="Chat messages">Chat messages</option>
                <option
                  v-if="selectedTemplateName !== 'Chat messages' && !BUILT_IN_TEMPLATES.some((template) => template.name === selectedTemplateName)"
                  :value="selectedTemplateName"
                >
                  {{ selectedTemplateName }} (Imported)
                </option>
                <option v-for="template in BUILT_IN_TEMPLATES" :key="template.name" :value="template.name">
                  {{ template.name }}
                </option>
              </select>
            </div>
            <div>
              <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">System prompt</label>
              <textarea
                v-model="presetForm.systemPrompt"
                class="min-h-28 w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                placeholder="Optional system prompt override"
              />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Temperature</label>
                <input
                  v-model.number="presetForm.temperature"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  max="2"
                  min="0"
                  step="0.1"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Max tokens</label>
                <input
                  v-model.number="presetForm.maxOutputTokens"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="1"
                  step="1"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Top P</label>
                <input
                  v-model.number="presetForm.topP"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  max="1"
                  min="0"
                  step="0.05"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Top K</label>
                <input
                  v-model.number="presetForm.topK"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="0"
                  step="1"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Min P</label>
                <input
                  v-model.number="presetForm.minP"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  max="1"
                  min="0"
                  step="0.01"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Repeat penalty</label>
                <input
                  v-model.number="presetForm.repeatPenalty"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="1"
                  step="0.05"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Freq penalty</label>
                <input
                  v-model.number="presetForm.frequencyPenalty"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  max="2"
                  min="0"
                  step="0.05"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Pres penalty</label>
                <input
                  v-model.number="presetForm.presencePenalty"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  max="2"
                  min="0"
                  step="0.05"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Context length</label>
                <input
                  v-model.number="presetForm.contextLength"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="4096"
                  step="256"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Seed</label>
                <input
                  v-model.number="presetForm.seed"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="0"
                  placeholder="Random"
                  step="1"
                  type="number"
                />
              </div>
              <div>
                <label class="mb-1 block text-[10px] uppercase tracking-wider text-white/25">Thinking budget</label>
                <input
                  :value="presetForm.thinkingBudgetTokens ?? ''"
                  class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-1.5 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
                  min="0"
                  placeholder="Unlimited"
                  step="1"
                  type="number"
                  @input="updateThinkingBudget"
                />
              </div>
            </div>
            <div class="flex gap-2">
              <button class="flex-1 rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white" type="submit">
                {{ editingPresetId ? 'Save' : 'Create' }}
              </button>
              <button
                class="rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/45 transition hover:text-white/70"
                type="button"
                @click="presetImportInputRef?.click()"
              >
                Import ST JSON
              </button>
              <button
                v-if="editingPresetId"
                class="rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/35 transition hover:text-white/60"
                type="button"
                @click="resetPresetForm"
              >
                Cancel
              </button>
            </div>
            <input ref="presetImportInputRef" class="hidden" type="file" accept="application/json,.json" @change="importPresetTemplate" />
          </form>

          <div class="space-y-1">
            <div
              v-for="preset in chatStore.presets"
              :key="preset.id"
              class="rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
            >
              <div class="flex items-center justify-between">
                <p class="text-sm font-medium text-white/75">{{ preset.name }}</p>
                <div class="flex gap-1.5">
                  <button
                    class="rounded px-2 py-0.5 text-[11px] transition hover:text-white/60"
                    :class="chatStore.activePreset?.id === preset.id ? 'text-[var(--rp-accent)]' : 'text-white/30'"
                    type="button"
                    @click="assignPreset(preset.id)"
                  >
                    {{ chatStore.activePreset?.id === preset.id ? 'Active' : 'Use' }}
                  </button>
                  <button class="rounded px-2 py-0.5 text-[11px] text-white/25 transition hover:text-white/50" type="button" @click="editPreset(preset.id)">
                    Edit
                  </button>
                  <button class="rounded px-2 py-0.5 text-[11px] text-rose-300/40 transition hover:text-rose-300/80" type="button" @click="removePreset(preset.id)">
                    Delete
                  </button>
                </div>
              </div>
                <p class="mt-0.5 text-[11px] text-white/25">
                  temp {{ preset.temperature }} &middot; max {{ preset.maxOutputTokens }} &middot; ctx {{ preset.contextLength }} &middot; top_p {{ preset.topP }} &middot; top_k {{ preset.topK }} &middot; min_p {{ preset.minP }}
                </p>
                <p class="text-[11px] text-white/20">
                  {{ preset.instructTemplate?.name ?? 'Chat messages' }}<span v-if="preset.thinkingBudgetTokens !== null"> &middot; think {{ preset.thinkingBudgetTokens }}</span>
                </p>
              </div>
            </div>
          </div>
      </div>
    </aside>

    <aside
      v-if="providerPanelOpen"
      class="rp-animate-fade w-64 shrink-0 overflow-hidden border-l border-white/5 bg-[var(--rp-bg)] lg:w-72"
    >
      <div class="rp-scrollbar flex h-full flex-col overflow-y-auto">
        <div class="flex h-12 items-center justify-between border-b border-white/5 px-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/25">Providers</p>
          <button class="text-white/25 hover:text-white/50" type="button" @click="providerPanelOpen = false">&times;</button>
        </div>

        <div class="p-4 space-y-3">
          <form class="space-y-2" @submit.prevent="saveProvider">
            <input
              v-model="providerForm.name"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Provider name"
            />
            <select
              v-model="providerForm.providerType"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
            >
              <option value="openai-compatible">OpenAI-compatible</option>
            </select>
            <input
              v-model="providerForm.baseUrl"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Base URL (e.g. http://localhost:8082)"
              type="url"
            />
            <input
              v-model="providerForm.model"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="Model name"
            />
            <input
              v-model="providerForm.apiKeyEnvVar"
              class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
              placeholder="API key env var (optional)"
            />
            <label class="flex items-center gap-2 text-sm text-white/50">
              <input v-model="providerForm.reasoningEnabled" type="checkbox" class="accent-[var(--rp-accent)]" />
              Reasoning support
            </label>
            <div class="flex gap-2">
              <button class="flex-1 rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white" type="submit">
                {{ editingProviderId ? 'Save' : 'Create' }}
              </button>
              <button
                v-if="editingProviderId"
                class="rounded-lg border border-white/8 px-3 py-1.5 text-sm text-white/35 transition hover:text-white/60"
                type="button"
                @click="resetProviderForm"
              >
                Cancel
              </button>
            </div>
          </form>

          <div class="space-y-1">
            <div
              v-for="provider in chatStore.providers"
              :key="provider.id"
              class="rounded-lg px-3 py-2.5 text-left transition hover:bg-white/[0.03]"
            >
              <p class="text-sm font-medium text-white/75">{{ provider.name }}</p>
              <p class="mt-0.5 text-[11px] text-white/25">{{ provider.model }} &middot; {{ provider.providerType }}</p>
              <div v-if="providerModels[provider.id]" class="mt-1.5 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5">
                <p v-for="model in providerModels[provider.id]" :key="model.id" class="text-[10px] text-white/35">{{ model.id }}</p>
              </div>
              <div class="mt-2 flex gap-1.5">
                <button
                  class="rounded px-2 py-0.5 text-[11px] transition hover:text-white/60"
                  :class="chatStore.activeChat?.providerConfigId === provider.id ? 'text-[var(--rp-accent)]' : 'text-white/30'"
                  type="button"
                  @click="assignProvider(provider.id)"
                >
                  {{ chatStore.activeChat?.providerConfigId === provider.id ? 'Active' : 'Use' }}
                </button>
                <button class="rounded px-2 py-0.5 text-[11px] text-white/25 transition hover:text-white/50" type="button" @click="fetchModels(provider.id)">
                  Models
                </button>
                <button class="rounded px-2 py-0.5 text-[11px] text-white/25 transition hover:text-white/50" type="button" @click="editProvider(provider.id)">
                  Edit
                </button>
                <button class="rounded px-2 py-0.5 text-[11px] text-rose-300/40 transition hover:text-rose-300/80" type="button" @click="removeProvider(provider.id)">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>

  <div v-if="deleteTargetChatId" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="deleteTargetChatId = null">
    <div class="w-80 rounded-xl border border-white/10 bg-[var(--rp-bg)] p-6">
      <p class="text-sm font-medium text-white/85">Delete conversation?</p>
      <p class="mt-2 text-xs text-white/40">This will permanently remove the chat and all its messages.</p>
      <div class="mt-4 flex gap-2">
        <button
          class="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white"
          type="button"
          @click="deleteTargetChatId = null"
        >
          Cancel
        </button>
        <button
          class="flex-1 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 transition hover:bg-rose-500/25"
          type="button"
          @click="deleteChat"
        >
          Delete
        </button>
      </div>
    </div>
  </div>

  <div v-if="showPasswordChange" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showPasswordChange = false">
    <div class="w-80 rounded-xl border border-white/10 bg-[var(--rp-bg)] p-6">
      <p class="text-sm font-medium text-white/85">Change password</p>
      <form class="mt-4 space-y-3" @submit.prevent="changePassword">
        <input
          v-model="passwordForm.current"
          class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
          placeholder="Current password"
          type="password"
        />
        <input
          v-model="passwordForm.next"
          class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
          placeholder="New password"
          type="password"
        />
        <p v-if="passwordError" class="text-xs text-rose-300">{{ passwordError }}</p>
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white"
            type="button"
            @click="showPasswordChange = false"
          >
            Cancel
          </button>
          <button
            class="flex-1 rounded-lg bg-[var(--rp-accent)] px-3 py-2 text-sm font-medium text-[#0a1212] transition hover:brightness-110"
            type="submit"
          >
            Update
          </button>
        </div>
      </form>
    </div>
  </div>

  <div v-if="showPersonaEditor" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="showPersonaEditor = false">
    <div class="w-[28rem] rounded-xl border border-white/10 bg-[var(--rp-bg)] p-6">
      <p class="text-sm font-medium text-white/85">Persona</p>
      <form class="mt-4 space-y-3" @submit.prevent="savePersona">
        <div class="flex items-center gap-3">
          <img v-if="personaAvatarUrl" :src="personaAvatarUrl" alt="" class="h-12 w-12 rounded-full object-cover" />
          <div
            v-else
            class="flex h-12 w-12 items-center justify-center rounded-full text-sm font-semibold"
            :style="personaAvatarStyle"
          >
            {{ (personaForm.name || 'Y').charAt(0).toUpperCase() }}
          </div>
          <label class="rounded-lg border border-white/10 px-3 py-2 text-sm text-white/55 transition hover:bg-white/[0.04] hover:text-white/75">
            Upload avatar
            <input class="hidden" type="file" accept="image/*" @change="uploadPersonaAvatar" />
          </label>
        </div>
        <input
          v-model="personaForm.name"
          class="w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
          placeholder="Persona name"
        />
        <textarea
          v-model="personaForm.description"
          class="min-h-28 w-full rounded-lg border border-white/6 bg-white/[0.02] px-3 py-2 text-sm text-white outline-none transition focus:border-[var(--rp-accent)]/35"
          placeholder="Persona description"
        />
        <div class="flex gap-2">
          <button
            class="flex-1 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition hover:bg-white/[0.04] hover:text-white"
            type="button"
            @click="showPersonaEditor = false"
          >
            Cancel
          </button>
          <button
            class="flex-1 rounded-lg bg-[var(--rp-accent)] px-3 py-2 text-sm font-medium text-[#0a1212] transition hover:brightness-110"
            type="submit"
          >
            Save persona
          </button>
        </div>
      </form>
    </div>
  </div>

  <p v-if="chatStore.error" class="fixed bottom-20 left-1/2 -translate-x-1/2 rounded-lg bg-rose-500/10 px-4 py-2 text-sm text-rose-300/80 rp-animate-fade">
    {{ chatStore.error }}
  </p>
</template>

<script setup lang="ts">
import type { CreateCharacterInput, CreatePresetInput, CreateProviderConfigInput, InstructTemplate } from '@forward/shared';
import { BUILT_IN_TEMPLATES } from '@forward/shared';
import { reactive, onMounted, ref, computed, watch, nextTick } from 'vue';
import { useRouter } from 'vue-router';

import { getApiBaseUrl } from '../lib/config';
import { api } from '../lib/api';
import MessageCard from '../components/MessageCard.vue';
import { useChatStore } from '../stores/chat';
import { useSessionStore } from '../stores/session';

const chatStore = useChatStore();
const authorNoteDraft = ref('');
const authorNoteOpen = ref(false);
const characterPanelOpen = ref(false);
const composer = ref('');
const composerRef = ref<HTMLTextAreaElement | null>(null);
const deleteTargetChatId = ref<string | null>(null);
const editingCharacterId = ref<string | null>(null);
const editingPresetId = ref<string | null>(null);
const editingProviderId = ref<string | null>(null);
const presetImportInputRef = ref<HTMLInputElement | null>(null);
const presetPanelOpen = ref(false);
const providerPanelOpen = ref(false);
const renameInputRef = ref<HTMLInputElement | null>(null);
const renameTitle = ref('');
const renamingChatId = ref<string | null>(null);
const scrollContainer = ref<HTMLElement | null>(null);
const sidebarOpen = ref(false);
const showPersonaEditor = ref(false);
const showPasswordChange = ref(false);
const passwordError = ref('');
const passwordForm = reactive({ current: '', next: '' });
const personaForm = reactive({ description: '', name: 'User' });
const characterForm = reactive<CreateCharacterInput>({
  avatarAssetPath: null,
  description: '',
  exampleDialogue: '',
  firstMessage: '',
  name: '',
  personality: '',
  scenario: '',
});
const presetForm = reactive<CreatePresetInput>({
  contextLength: 131072,
  frequencyPenalty: 0,
  instructTemplate: null,
  maxOutputTokens: 256,
  minP: 0.05,
  name: '',
  presencePenalty: 0,
  repeatPenalty: 1,
  seed: null,
  stopStrings: [],
  systemPrompt: '',
  temperature: 0.7,
  thinkingBudgetTokens: null,
  topK: 40,
  topP: 0.9,
});
const providerForm = reactive<CreateProviderConfigInput>({
  apiKeyEnvVar: null,
  baseUrl: '',
  model: '',
  name: '',
  providerType: 'openai-compatible',
  reasoningEnabled: false,
});
const providerModels = ref<Record<string, Array<{ id: string }>>>({});
const selectedTemplateName = ref<string>('Chat messages');
const router = useRouter();
const sessionStore = useSessionStore();
let firstMessageSent = false;

watch(() => chatStore.activeChat?.id, () => {
  authorNoteDraft.value = chatStore.activeChat?.authorNote ?? '';
});

async function saveAuthorNote() {
  const note = authorNoteDraft.value;

  if (chatStore.activeChat && note !== chatStore.activeChat.authorNote) {
    await chatStore.updateChatAuthorNote(note);
  }
}

function avatarStyleForName(name: string) {
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
}

function avatarUrlFor(path: string | null): string {
  if (!path) return '';
  return `${getApiBaseUrl()}/media/avatars/${path.split(/[/\\]/).pop()}`;
}

const characterAvatarStyle = computed(() => avatarStyleForName(chatStore.activeCharacter?.name || 'A'));

const characterAvatarUrl = computed(() => {
  if (!chatStore.activeCharacter?.avatarAssetPath) return null;
  return avatarUrlFor(chatStore.activeCharacter.avatarAssetPath);
});

interface DisplayMessageEntry {
  attemptPosition?: number;
  attemptTotal?: number;
  message: (typeof chatStore.activeMessages)[number];
  nextAttemptId?: string | null;
  previousAttemptId?: string | null;
}

const coveredMessageIds = computed(() => {
  const ids = new Set<string>();

  for (const message of chatStore.activeMessages) {
    for (const id of message.summaryOf) {
      ids.add(id);
    }
  }

  return ids;
});

const displayMessages = computed<DisplayMessageEntry[]>(() => {
  const seenAttemptGroups = new Set<string>();

  return chatStore.activeMessages.flatMap((message) => {
    if (message.role !== 'assistant' || !message.attemptGroupId) {
      return [{ message }];
    }

    if (seenAttemptGroups.has(message.attemptGroupId)) {
      return [];
    }

    seenAttemptGroups.add(message.attemptGroupId);
    const attempts = chatStore.activeMessages
      .filter((entry) => entry.role === 'assistant' && entry.attemptGroupId === message.attemptGroupId)
      .sort((left, right) => left.attemptIndex - right.attemptIndex);
    const activeIndex = Math.max(0, attempts.findIndex((entry) => entry.isActiveAttempt));
    const activeAttempt = attempts[activeIndex] ?? message;

    return [{
      attemptPosition: activeIndex + 1,
      attemptTotal: attempts.length,
      message: activeAttempt,
      nextAttemptId: attempts[activeIndex + 1]?.id ?? null,
      previousAttemptId: attempts[activeIndex - 1]?.id ?? null,
    }];
  });
});

const canContinue = computed(() => displayMessages.value.at(-1)?.message.role === 'assistant');

const personaAvatarStyle = computed(() => avatarStyleForName(personaForm.name || 'Y'));

const personaAvatarUrl = computed(() => {
  if (!chatStore.appSettings?.personaAvatarAssetPath) return null;
  return avatarUrlFor(chatStore.appSettings.personaAvatarAssetPath);
});

function scrollToBottom() {
  nextTick(() => {
    const el = scrollContainer.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

watch(() => chatStore.activeMessages.length, () => {
  scrollToBottom();
});

watch(() => {
  const msgs = chatStore.activeMessages;
  const last = msgs[msgs.length - 1];
  if (!last) return '';
  return `${last.id}:${last.content?.length ?? 0}:${last.reasoningContent?.length ?? 0}:${last.state}`;
}, () => {
  scrollToBottom();
});

watch(() => chatStore.activeChatId, async (newId) => {
  if (newId) {
    await chatStore.loadMessages(newId);
    scrollToBottom();
  }
  firstMessageSent = false;
  await checkFirstMessage();
});

onMounted(async () => {
  await chatStore.initialize();
  personaForm.name = chatStore.appSettings?.personaName ?? 'User';
  personaForm.description = chatStore.appSettings?.personaDescription ?? '';
  scrollToBottom();
  await checkFirstMessage();
});

watch(() => chatStore.appSettings, (settings) => {
  if (!settings) return;
  personaForm.name = settings.personaName;
  personaForm.description = settings.personaDescription;
}, { deep: true });

async function checkFirstMessage() {
  if (firstMessageSent) return;
  if (!chatStore.activeChat) return;
  if (chatStore.activeMessages.length > 0) return;
  const character = chatStore.activeCharacter;
  if (!character?.firstMessage) return;
  firstMessageSent = true;

  try {
    await chatStore.createAssistantMessage(character.firstMessage);
  } catch {
    firstMessageSent = false;
  }
}

function autoResize() {
  const el = composerRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
}

async function createChat() {
  await chatStore.ensureChat();
}

function confirmDeleteChat(chatId: string) {
  deleteTargetChatId.value = chatId;
}

async function deleteChat() {
  if (!deleteTargetChatId.value) return;
  await chatStore.deleteChat(deleteTargetChatId.value);
  deleteTargetChatId.value = null;
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

async function savePersona() {
  await chatStore.updateSettings({
    personaDescription: personaForm.description,
    personaName: personaForm.name.trim() || 'User',
  });
  showPersonaEditor.value = false;
}

async function uploadPersonaAvatar(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  await chatStore.uploadPersonaAvatar(file);
  input.value = '';
}

async function attachCharacter(characterId: string | null) {
  await chatStore.ensureChat();
  await chatStore.assignCharacterToActiveChat(characterId);
  await checkFirstMessage();
}

async function removeCharacter(characterId: string) {
  if (editingCharacterId.value === characterId) resetCharacterForm();
  await chatStore.deleteCharacter(characterId);
}

function resetPresetForm() {
  editingPresetId.value = null;
  presetForm.name = '';
  presetForm.systemPrompt = '';
  presetForm.instructTemplate = null;
  selectedTemplateName.value = 'Chat messages';
  presetForm.temperature = 0.7;
  presetForm.maxOutputTokens = 256;
  presetForm.topP = 0.9;
  presetForm.topK = 40;
  presetForm.minP = 0.05;
  presetForm.frequencyPenalty = 0;
  presetForm.presencePenalty = 0;
  presetForm.repeatPenalty = 1;
  presetForm.seed = null;
  presetForm.contextLength = 131072;
  presetForm.thinkingBudgetTokens = null;
  presetForm.stopStrings = [];
}

function updateThinkingBudget(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  presetForm.thinkingBudgetTokens = value === '' ? null : Number(value);
}

function cloneTemplate(template: InstructTemplate): InstructTemplate {
  return { ...template };
}

function applySelectedTemplate() {
  if (selectedTemplateName.value === 'Chat messages') {
    presetForm.instructTemplate = null;
    return;
  }

  const template = BUILT_IN_TEMPLATES.find((entry) => entry.name === selectedTemplateName.value);
  presetForm.instructTemplate = template ? cloneTemplate(template) : null;
}

function editPreset(presetId: string) {
  const preset = chatStore.presets.find((p) => p.id === presetId);
  if (!preset) return;
  editingPresetId.value = preset.id;
  presetPanelOpen.value = true;
  presetForm.name = preset.name;
  presetForm.systemPrompt = preset.systemPrompt;
  presetForm.instructTemplate = preset.instructTemplate ? cloneTemplate(preset.instructTemplate) : null;
  selectedTemplateName.value = preset.instructTemplate?.name ?? 'Chat messages';
  presetForm.temperature = preset.temperature;
  presetForm.maxOutputTokens = preset.maxOutputTokens;
  presetForm.topP = preset.topP;
  presetForm.topK = preset.topK;
  presetForm.minP = preset.minP;
  presetForm.frequencyPenalty = preset.frequencyPenalty;
  presetForm.presencePenalty = preset.presencePenalty;
  presetForm.repeatPenalty = preset.repeatPenalty;
  presetForm.seed = preset.seed;
  presetForm.contextLength = preset.contextLength;
  presetForm.thinkingBudgetTokens = preset.thinkingBudgetTokens;
  presetForm.stopStrings = [...preset.stopStrings];
}

async function savePreset() {
  if (!presetForm.name.trim()) return;
  const payload = { ...presetForm, name: presetForm.name.trim() };
  if (editingPresetId.value) {
    await chatStore.updatePreset(editingPresetId.value, payload);
  } else {
    await chatStore.createPreset(payload);
  }
  resetPresetForm();
}

async function importPresetTemplate(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  const preset = await chatStore.importPresetTemplate(file, editingPresetId.value ?? undefined);

  editingPresetId.value = preset.id;
  presetPanelOpen.value = true;
  editPreset(preset.id);
  input.value = '';
}

async function assignPreset(presetId: string) {
  await chatStore.ensureChat();
  await chatStore.assignPresetToActiveChat(presetId);
}

async function removePreset(presetId: string) {
  if (editingPresetId.value === presetId) resetPresetForm();
  await chatStore.deletePreset(presetId);
}

function resetProviderForm() {
  editingProviderId.value = null;
  providerForm.name = '';
  providerForm.providerType = 'openai-compatible';
  providerForm.baseUrl = '';
  providerForm.model = '';
  providerForm.apiKeyEnvVar = null;
  providerForm.reasoningEnabled = false;
}

function editProvider(providerId: string) {
  const provider = chatStore.providers.find((p) => p.id === providerId);
  if (!provider) return;
  editingProviderId.value = provider.id;
  providerPanelOpen.value = true;
  providerForm.name = provider.name;
  providerForm.providerType = provider.providerType;
  providerForm.baseUrl = provider.baseUrl;
  providerForm.model = provider.model;
  providerForm.apiKeyEnvVar = provider.apiKeyEnvVar;
  providerForm.reasoningEnabled = provider.reasoningEnabled;
}

async function saveProvider() {
  if (!providerForm.name.trim() || !providerForm.baseUrl.trim() || !providerForm.model.trim()) return;
  const payload = { ...providerForm, name: providerForm.name.trim(), baseUrl: providerForm.baseUrl.trim(), model: providerForm.model.trim() };
  if (editingProviderId.value) {
    await chatStore.updateProviderConfig(editingProviderId.value, payload);
  } else {
    await chatStore.createProviderConfig(payload);
  }
  resetProviderForm();
}

async function assignProvider(providerId: string) {
  await chatStore.ensureChat();
  await chatStore.assignProviderConfigToActiveChat(providerId);
}

async function removeProvider(providerId: string) {
  if (editingProviderId.value === providerId) resetProviderForm();
  await chatStore.deleteProviderConfig(providerId);
}

async function fetchModels(providerId: string) {
  try {
    const response = await api.listProviderModels(providerId);
    providerModels.value[providerId] = response.models;
  } catch {
    providerModels.value[providerId] = [];
  }
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

function startRename(chatId: string, currentTitle: string) {
  renamingChatId.value = chatId;
  renameTitle.value = currentTitle;
  nextTick(() => {
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
}

function cancelRename() {
  renamingChatId.value = null;
  renameTitle.value = '';
}

async function saveRename(chatId: string) {
  const title = renameTitle.value.trim();
  if (!title) {
    cancelRename();
    return;
  }

  if (renamingChatId.value === chatId) {
    renamingChatId.value = null;
  }

  await chatStore.renameChat(chatId, title);
}

async function handleRetry(messageId: string) {
  await chatStore.retryGeneration();
}

async function handleDeleteMessage(messageId: string) {
  await chatStore.deleteMessage(messageId);
}

async function handleEditMessage(messageId: string, content: string) {
  await chatStore.editAndRegenerate(messageId, content);
}

async function handleSelectAttempt(messageId: string) {
  await chatStore.selectMessageAttempt(messageId);
}

async function changePassword() {
  if (!passwordForm.current || !passwordForm.next) {
    passwordError.value = 'Both fields are required';
    return;
  }

  try {
    await api.changePassword(passwordForm.current, passwordForm.next);
    passwordForm.current = '';
    passwordForm.next = '';
    passwordError.value = '';
    showPasswordChange.value = false;
  } catch (error) {
    passwordError.value = error instanceof Error ? error.message : 'Failed to change password';
  }
}
</script>
