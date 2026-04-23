import type {
  Character,
  Chat,
  CreateCharacterInput,
  CreateChatInput,
  CreatePresetInput,
  CreateProviderConfigInput,
  CreateMessageInput,
  Message,
  NormalizedStreamEvent,
  Preset,
  PromptPreview,
  ProviderConfig,
  ProviderListResponse,
  ProviderModelsResponse,
  RetryChatInput,
  SessionResponse,
  UpdateCharacterInput,
  UpdateChatInput,
  UpdatePresetInput,
  UpdateProviderConfigInput,
} from '@forward/shared';

import { getApiBaseUrl } from './config';
import { readSseStream } from './sse';

interface GenerateChatInput {
  content: string;
  maxOutputTokens?: number;
  providerConfigId?: string;
  temperature?: number;
}

interface RequestOptions extends RequestInit {
  signal?: AbortSignal;
}

async function request(path: string, init?: RequestOptions): Promise<Response> {
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
    signal: init?.signal ?? undefined,
  });

  return response;
}

async function expectJson<T>(path: string, init?: RequestOptions): Promise<T> {
  const response = await request(path, init);

  if (!response.ok) {
    throw new Error(`request to ${path} failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export const api = {
  async createCharacter(input: CreateCharacterInput): Promise<Character> {
    return expectJson<Character>('/characters', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },
  async createPreset(input: CreatePresetInput): Promise<Preset> {
    return expectJson<Preset>('/presets', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },
  async createProviderConfig(input: CreateProviderConfigInput): Promise<ProviderConfig> {
    return expectJson<ProviderConfig>('/providers', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },
  async deleteCharacter(characterId: string): Promise<void> {
    const response = await request(`/characters/${characterId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`failed to delete character ${characterId}`);
    }
  },
  async deletePreset(presetId: string): Promise<void> {
    const response = await request(`/presets/${presetId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`failed to delete preset ${presetId}`);
    }
  },
  async deleteProviderConfig(providerId: string): Promise<void> {
    const response = await request(`/providers/${providerId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`failed to delete provider ${providerId}`);
    }
  },
  async createChat(input: CreateChatInput): Promise<Chat> {
    return expectJson<Chat>('/chats', {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },
  async createMessage(chatId: string, input: CreateMessageInput): Promise<Message> {
    return expectJson<Message>(`/chats/${chatId}/messages`, {
      body: JSON.stringify(input),
      method: 'POST',
    });
  },
  async deleteChat(chatId: string): Promise<void> {
    const response = await request(`/chats/${chatId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`failed to delete chat ${chatId}`);
    }
  },
  async deleteMessage(messageId: string): Promise<void> {
    const response = await request(`/messages/${messageId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error(`failed to delete message ${messageId}`);
    }
  },
  async generate(chatId: string, input: GenerateChatInput, onEvent: (event: NormalizedStreamEvent) => void, signal?: AbortSignal): Promise<void> {
    const response = await request(`/chats/${chatId}/generate`, {
      body: JSON.stringify(input),
      method: 'POST',
      signal,
    });

    await readSseStream(response, onEvent, signal);
  },
  async retryChat(chatId: string, input: RetryChatInput, onEvent: (event: NormalizedStreamEvent) => void, signal?: AbortSignal): Promise<void> {
    const response = await request(`/chats/${chatId}/retry`, {
      body: JSON.stringify(input),
      method: 'POST',
      signal,
    });

    await readSseStream(response, onEvent, signal);
  },
  async getPromptPreview(chatId: string): Promise<PromptPreview> {
    return expectJson<PromptPreview>(`/chats/${chatId}/prompt-preview`);
  },
  async getSession(): Promise<SessionResponse> {
    return expectJson<SessionResponse>('/auth/session');
  },
  async importCharacter(file: File): Promise<Character> {
    const formData = new FormData();

    formData.append('file', file);

    return expectJson<Character>('/characters/import', {
      body: formData,
      method: 'POST',
    });
  },
  async importPresetTemplate(file: File, presetId?: string): Promise<Preset> {
    const formData = new FormData();

    formData.append('file', file);

    if (presetId) {
      formData.append('presetId', presetId);
    }

    return expectJson<Preset>('/presets/import', {
      body: formData,
      method: 'POST',
    });
  },
  async listCharacters(): Promise<Character[]> {
    return expectJson<Character[]>('/characters');
  },
  async listChats(): Promise<Chat[]> {
    return expectJson<Chat[]>('/chats');
  },
  async listMessages(chatId: string): Promise<Message[]> {
    return expectJson<Message[]>(`/chats/${chatId}/messages`);
  },
  async listPresets(): Promise<Preset[]> {
    return expectJson<Preset[]>('/presets');
  },
  async listProviderModels(providerId: string): Promise<ProviderModelsResponse> {
    return expectJson<ProviderModelsResponse>(`/providers/${providerId}/models`);
  },
  async listProviders(): Promise<ProviderConfig[]> {
    const response = await expectJson<ProviderListResponse>('/providers');

    return response.providers;
  },
  async login(password: string): Promise<void> {
    const response = await request('/auth/login', {
      body: JSON.stringify({ password }),
      method: 'POST',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid password');
      }

      throw new Error(`Login failed (${response.status})`);
    }
  },
  async logout(): Promise<void> {
    const response = await request('/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Logout failed');
    }
  },
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const response = await request('/auth/change-password', {
      body: JSON.stringify({ currentPassword, newPassword }),
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Failed to change password' })) as { error?: string };
      throw new Error(data.error ?? `Failed to change password (${response.status})`);
    }
  },
  async updateChat(chatId: string, input: UpdateChatInput): Promise<Chat> {
    return expectJson<Chat>(`/chats/${chatId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
  },
  async updateCharacter(characterId: string, input: UpdateCharacterInput): Promise<Character> {
    return expectJson<Character>(`/characters/${characterId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
  },
  async updatePreset(presetId: string, input: UpdatePresetInput): Promise<Preset> {
    return expectJson<Preset>(`/presets/${presetId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
  },
  async updateProviderConfig(providerId: string, input: UpdateProviderConfigInput): Promise<ProviderConfig> {
    return expectJson<ProviderConfig>(`/providers/${providerId}`, {
      body: JSON.stringify(input),
      method: 'PATCH',
    });
  },
};
