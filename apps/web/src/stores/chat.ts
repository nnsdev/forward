import type {
  AppSettings,
  Character,
  Chat,
  CreateCharacterInput,
  CreatePresetInput,
  CreateProviderConfigInput,
  Message,
  NormalizedStreamEvent,
  Preset,
  ProviderConfig,
  UpdateCharacterInput,
  UpdateAppSettingsInput,
  UpdatePresetInput,
  UpdateProviderConfigInput,
} from '@forward/shared';
import { defineStore } from 'pinia';

import { api } from '../lib/api';

function makeTempId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export const useChatStore = defineStore('chat', {
  state: () => ({
    activeChatId: null as string | null,
    appSettings: null as AppSettings | null,
    characters: [] as Character[],
    chats: [] as Chat[],
    error: '' as string,
    generating: false,
    initialized: false,
    loading: false,
    messagesByChatId: {} as Record<string, Message[]>,
    presets: [] as Preset[],
    providers: [] as ProviderConfig[],
  }),
  getters: {
    activeChat(state): Chat | null {
      return state.chats.find((chat) => chat.id === state.activeChatId) ?? null;
    },
    activeCharacter(state): Character | null {
      const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);

      if (!activeChat?.characterId) {
        return null;
      }

      return state.characters.find((character) => character.id === activeChat.characterId) ?? null;
    },
    activeMessages(state): Message[] {
      if (!state.activeChatId) {
        return [];
      }

      return state.messagesByChatId[state.activeChatId] ?? [];
    },
    activePreset(state): Preset | null {
      const activeChat = state.chats.find((chat) => chat.id === state.activeChatId);

      if (!activeChat?.presetId) {
        return state.presets[0] ?? null;
      }

      return state.presets.find((preset) => preset.id === activeChat.presetId) ?? null;
    },
    defaultProvider(state): ProviderConfig | null {
      return state.providers[0] ?? null;
    },
  },
  actions: {
    abortController: null as AbortController | null,

    appendStreamEvent(chatId: string, event: NormalizedStreamEvent) {
      const currentMessages = [...(this.messagesByChatId[chatId] ?? [])];
      const lastMessage = currentMessages.at(-1);

      if (event.type === 'response.started') {
        if (lastMessage?.id === event.messageId) {
          currentMessages[currentMessages.length - 1] = {
            ...lastMessage,
            state: 'streaming',
            updatedAt: new Date().toISOString(),
          };
          this.messagesByChatId[chatId] = currentMessages;
          return;
        }

        const userIndex = currentMessages.findIndex((message) => message.id.startsWith('temp-user-'));

        if (userIndex !== -1) {
          currentMessages[userIndex] = {
            ...currentMessages[userIndex],
            state: 'completed',
          };
        }

        currentMessages.push({
          attemptGroupId: event.messageId,
          attemptIndex: 0,
          chatId,
          content: '',
          createdAt: new Date().toISOString(),
          id: event.messageId,
          isActiveAttempt: true,
          reasoningContent: '',
          role: 'assistant',
          state: 'streaming',
          summaryOf: [],
          updatedAt: new Date().toISOString(),
        });
      }

      if (event.type === 'reasoning.delta' && lastMessage) {
        currentMessages[currentMessages.length - 1] = {
          ...lastMessage,
          reasoningContent: `${lastMessage.reasoningContent}${event.text}`,
          updatedAt: new Date().toISOString(),
        };
      }

      if (event.type === 'content.delta' && lastMessage) {
        currentMessages[currentMessages.length - 1] = {
          ...lastMessage,
          content: `${lastMessage.content}${event.text}`,
          updatedAt: new Date().toISOString(),
        };
      }

      if (event.type === 'response.completed' && lastMessage) {
        currentMessages[currentMessages.length - 1] = {
          ...lastMessage,
          state: 'completed',
          updatedAt: new Date().toISOString(),
        };
      }

      if (event.type === 'response.error' && lastMessage) {
        currentMessages[currentMessages.length - 1] = {
          ...lastMessage,
          state: 'failed',
          updatedAt: new Date().toISOString(),
        };
        this.error = event.error ?? 'Generation failed';
      }

      this.messagesByChatId[chatId] = currentMessages;
    },
    async assignCharacterToActiveChat(characterId: string | null) {
      if (!this.activeChat) {
        return;
      }

      const updatedChat = await api.updateChat(this.activeChat.id, {
        characterId,
      });

      this.chats = this.chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      this.activeChatId = updatedChat.id;
    },
    async assignPresetToActiveChat(presetId: string | null) {
      if (!this.activeChat) {
        return;
      }

      const updatedChat = await api.updateChat(this.activeChat.id, {
        presetId,
      });

      this.chats = this.chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      this.activeChatId = updatedChat.id;
    },
    async createCharacter(input: CreateCharacterInput) {
      const character = await api.createCharacter(input);

      this.characters = [...this.characters, character].sort((left, right) => left.name.localeCompare(right.name));

      return character;
    },
    async createPreset(input: CreatePresetInput) {
      const preset = await api.createPreset(input);

      this.presets = [...this.presets, preset].sort((left, right) => left.name.localeCompare(right.name));

      return preset;
    },
    async deleteCharacter(characterId: string) {
      await api.deleteCharacter(characterId);

      this.characters = this.characters.filter((character) => character.id !== characterId);

      if (this.activeChat?.characterId === characterId) {
        await this.assignCharacterToActiveChat(null);
      }
    },
    async deletePreset(presetId: string) {
      await api.deletePreset(presetId);

      this.presets = this.presets.filter((preset) => preset.id !== presetId);

      if (this.activeChat?.presetId === presetId) {
        await this.assignPresetToActiveChat(this.presets[0]?.id ?? null);
      }
    },
    async deleteChat(chatId: string) {
      await api.deleteChat(chatId);

      this.chats = this.chats.filter((chat) => chat.id !== chatId);
      delete this.messagesByChatId[chatId];

      if (this.activeChatId === chatId) {
        this.activeChatId = this.chats[0]?.id ?? null;
      }
    },
    async ensureChat(): Promise<Chat> {
      if (this.activeChat) {
        return this.activeChat;
      }

      const provider = this.defaultProvider;
      const preset = this.activePreset ?? this.presets[0] ?? null;
      const chat = await api.createChat({
        authorNote: '',
        presetId: preset?.id,
        providerConfigId: provider?.id,
        title: `Chat ${this.chats.length + 1}`,
      });

      this.chats = [chat, ...this.chats];
      this.activeChatId = chat.id;
      this.messagesByChatId[chat.id] = [];

      return chat;
    },
    async initialize() {
      if (this.initialized) {
        return;
      }

      this.loading = true;
      this.error = '';

      try {
        const [settings, providers, chats, characters, presets] = await Promise.all([
          api.getSettings(),
          api.listProviders(),
          api.listChats(),
          api.listCharacters(),
          api.listPresets(),
        ]);

        this.appSettings = settings;
        this.providers = providers;
        this.chats = chats;
        this.characters = characters;
        this.presets = presets;
        this.activeChatId = chats[0]?.id ?? null;

        if (this.activeChatId) {
          await this.loadMessages(this.activeChatId);
        }

        this.initialized = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to initialize chat state';
      } finally {
        this.loading = false;
      }
    },
    async importCharacter(file: File) {
      const character = await api.importCharacter(file);

      this.characters = [...this.characters, character].sort((left, right) => left.name.localeCompare(right.name));

      return character;
    },
    async importPresetTemplate(file: File, presetId?: string) {
      const preset = await api.importPresetTemplate(file, presetId);

      const existingIndex = this.presets.findIndex((entry) => entry.id === preset.id);

      if (existingIndex === -1) {
        this.presets = [...this.presets, preset].sort((left, right) => left.name.localeCompare(right.name));
      } else {
        this.presets = this.presets
          .map((entry) => (entry.id === preset.id ? preset : entry))
          .sort((left, right) => left.name.localeCompare(right.name));
      }

      return preset;
    },
    async updateSettings(input: UpdateAppSettingsInput) {
      this.appSettings = await api.updateSettings(input);

      return this.appSettings;
    },
    async uploadPersonaAvatar(file: File) {
      this.appSettings = await api.uploadPersonaAvatar(file);

      return this.appSettings;
    },
    async loadMessages(chatId: string) {
      this.messagesByChatId[chatId] = await api.listMessages(chatId);
    },
    async refreshAfterGeneration(chatId: string) {
      this.messagesByChatId[chatId] = await api.listMessages(chatId);
      this.chats = await api.listChats();
    },
    async selectChat(chatId: string) {
      this.activeChatId = chatId;

      if (!this.messagesByChatId[chatId]) {
        await this.loadMessages(chatId);
      }
    },
    async sendMessage(content: string) {
      const trimmed = content.trim();

      if (!trimmed || this.generating) {
        return;
      }

      const chat = await this.ensureChat();
      const tempUserMessage: Message = {
        attemptGroupId: null,
        attemptIndex: 0,
        chatId: chat.id,
        content: trimmed,
        createdAt: new Date().toISOString(),
        id: makeTempId('temp-user'),
        isActiveAttempt: true,
        reasoningContent: '',
        role: 'user',
        state: 'pending',
        summaryOf: [],
        updatedAt: new Date().toISOString(),
      };

      this.error = '';
      this.generating = true;

      const controller = new AbortController();
      this.abortController = controller;

      this.messagesByChatId[chat.id] = [...(this.messagesByChatId[chat.id] ?? []), tempUserMessage];

      try {
        await api.generate(
          chat.id,
          {
            content: trimmed,
            maxOutputTokens: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.maxOutputTokens ?? undefined) : this.activePreset?.maxOutputTokens,
            providerConfigId: chat.providerConfigId ?? this.defaultProvider?.id,
            temperature: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.temperature ?? undefined) : this.activePreset?.temperature,
          },
          (event) => this.appendStreamEvent(chat.id, event),
          controller.signal,
        );

        await this.refreshAfterGeneration(chat.id);
      } catch (error) {
        if (controller.signal.aborted) {
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to generate response';
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        }
      } finally {
        this.generating = false;
        this.abortController = null;
      }
    },
    async createAssistantMessage(content: string) {
      const trimmed = content.trim();

      if (!trimmed) {
        return;
      }

      const chat = await this.ensureChat();
      const message = await api.createMessage(chat.id, {
        content: trimmed,
        role: 'assistant',
      });

      this.messagesByChatId[chat.id] = [...(this.messagesByChatId[chat.id] ?? []), message];
      this.chats = await api.listChats();

      return message;
    },
    cancelGeneration() {
      this.abortController?.abort();
    },
    async deleteMessage(messageId: string) {
      const chatId = this.activeChatId;

      if (!chatId) {
        return;
      }

      await api.deleteMessage(messageId);
      this.messagesByChatId[chatId] = (this.messagesByChatId[chatId] ?? []).filter((message) => message.id !== messageId);
    },
    async selectMessageAttempt(messageId: string) {
      const chatId = this.activeChatId;

      if (!chatId) {
        return;
      }

      await api.selectMessageAttempt(messageId);
      await this.loadMessages(chatId);
    },
    async updateMessage(messageId: string, content: string) {
      const chatId = this.activeChatId;

      if (!chatId) {
        return;
      }

      const updated = await api.updateMessage(messageId, { content });
      this.messagesByChatId[chatId] = (this.messagesByChatId[chatId] ?? []).map((message) =>
        message.id === updated.id ? updated : message,
      );
    },
    async editAndRegenerate(messageId: string, content: string) {
      const chatId = this.activeChatId;

      if (!chatId || this.generating) {
        return;
      }

      const updated = await api.updateMessage(messageId, { content });
      const currentMessages = this.messagesByChatId[chatId] ?? [];
      const editedIndex = currentMessages.findIndex((message) => message.id === updated.id);

      if (editedIndex === -1) {
        return;
      }

      const messagesToDelete = currentMessages.slice(editedIndex + 1);

      for (const message of messagesToDelete) {
        await api.deleteMessage(message.id);
      }

      this.messagesByChatId[chatId] = currentMessages.slice(0, editedIndex + 1).map((message) =>
        message.id === updated.id ? updated : message,
      );

      this.error = '';
      this.generating = true;

      const controller = new AbortController();
      this.abortController = controller;

      try {
        await api.regenerateChat(
          chatId,
          {
            maxOutputTokens: this.activePreset?.maxOutputTokens,
            providerConfigId: this.activeChat?.providerConfigId ?? this.defaultProvider?.id,
            temperature: this.activePreset?.temperature,
          },
          (event) => this.appendStreamEvent(chatId, event),
          controller.signal,
        );

        await this.refreshAfterGeneration(chatId);
      } catch (error) {
        if (controller.signal.aborted) {
          await this.refreshAfterGeneration(chatId).catch(() => undefined);
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to regenerate';
          await this.refreshAfterGeneration(chatId).catch(() => undefined);
        }
      } finally {
        this.generating = false;
        this.abortController = null;
      }
    },
    async renameChat(chatId: string, title: string) {
      const chat = await api.updateChat(chatId, { title });
      this.chats = this.chats.map((c) => (c.id === chat.id ? chat : c));
    },
    async retryGeneration() {
      const chat = this.activeChat;

      if (!chat || this.generating) {
        return;
      }

      this.error = '';
      this.generating = true;

      const controller = new AbortController();
      this.abortController = controller;

      try {
        await api.retryChat(
          chat.id,
          {
            maxOutputTokens: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.maxOutputTokens ?? undefined) : this.activePreset?.maxOutputTokens,
            providerConfigId: chat.providerConfigId ?? this.defaultProvider?.id,
            temperature: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.temperature ?? undefined) : this.activePreset?.temperature,
          },
          (event) => this.appendStreamEvent(chat.id, event),
          controller.signal,
        );

        await this.refreshAfterGeneration(chat.id);
      } catch (error) {
        if (controller.signal.aborted) {
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to retry generation';
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        }
      } finally {
        this.generating = false;
        this.abortController = null;
      }
    },
    async continueGeneration() {
      const chat = this.activeChat;

      if (!chat || this.generating) {
        return;
      }

      const lastMessage = [...this.activeMessages]
        .filter((message) => message.role !== 'assistant' || message.isActiveAttempt !== false)
        .at(-1);

      if (!lastMessage || lastMessage.role !== 'assistant') {
        return;
      }

      this.error = '';
      this.generating = true;

      const controller = new AbortController();
      this.abortController = controller;

      try {
        await api.continueChat(
          chat.id,
          {
            maxOutputTokens: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.maxOutputTokens ?? undefined) : this.activePreset?.maxOutputTokens,
            providerConfigId: chat.providerConfigId ?? this.defaultProvider?.id,
            temperature: chat.presetId ? (this.presets.find((preset) => preset.id === chat.presetId)?.temperature ?? undefined) : this.activePreset?.temperature,
          },
          (event) => this.appendStreamEvent(chat.id, event),
          controller.signal,
        );

        await this.refreshAfterGeneration(chat.id);
      } catch (error) {
        if (controller.signal.aborted) {
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        } else {
          this.error = error instanceof Error ? error.message : 'Failed to continue generation';
          await this.refreshAfterGeneration(chat.id).catch(() => undefined);
        }
      } finally {
        this.generating = false;
        this.abortController = null;
      }
    },
    async updateCharacter(characterId: string, input: UpdateCharacterInput) {
      const character = await api.updateCharacter(characterId, input);

      this.characters = this.characters
        .map((existingCharacter) => (existingCharacter.id === character.id ? character : existingCharacter))
        .sort((left, right) => left.name.localeCompare(right.name));

      return character;
    },
    async updatePreset(presetId: string, input: UpdatePresetInput) {
      const preset = await api.updatePreset(presetId, input);

      this.presets = this.presets.map((existingPreset) => (existingPreset.id === preset.id ? preset : existingPreset)).sort((left, right) => left.name.localeCompare(right.name));

      return preset;
    },
    async createProviderConfig(input: CreateProviderConfigInput) {
      const providerConfig = await api.createProviderConfig(input);

      this.providers = [...this.providers, providerConfig].sort((left, right) => left.name.localeCompare(right.name));

      return providerConfig;
    },
    async updateProviderConfig(providerId: string, input: UpdateProviderConfigInput) {
      const providerConfig = await api.updateProviderConfig(providerId, input);

      this.providers = this.providers.map((existingProvider) => (existingProvider.id === providerConfig.id ? providerConfig : existingProvider)).sort((left, right) => left.name.localeCompare(right.name));

      return providerConfig;
    },
    async deleteProviderConfig(providerId: string) {
      await api.deleteProviderConfig(providerId);

      this.providers = this.providers.filter((existingProvider) => existingProvider.id !== providerId);
    },
    async assignProviderConfigToActiveChat(providerConfigId: string | null) {
      if (!this.activeChat) {
        return;
      }

      const updatedChat = await api.updateChat(this.activeChat.id, {
        providerConfigId,
      });

      this.chats = this.chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
      this.activeChatId = updatedChat.id;
    },
    async updateChatAuthorNote(authorNote: string) {
      if (!this.activeChat) {
        return;
      }

      const updatedChat = await api.updateChat(this.activeChat.id, { authorNote });

      this.chats = this.chats.map((chat) => (chat.id === updatedChat.id ? updatedChat : chat));
    },
  },
});
