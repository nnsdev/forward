import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function createSseResponse(frames: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(frames.join('')));
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
      },
      status: 200,
    },
  );
}

describe('chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads providers, creates a chat, and persists streamed messages', async () => {
    const settings = {
      createdAt: '2026-04-22T00:00:00.000Z',
      defaultPresetId: null,
      defaultProviderConfigId: null,
      id: 'app_settings',
      personaAvatarAssetPath: null,
      personaDescription: '',
      personaName: 'User',
      showReasoningByDefault: false,
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const provider = {
      apiKeyEnvVar: null,
      baseUrl: 'http://127.0.0.1:8080',
      id: 'provider_local',
      model: 'qwen',
      name: 'Local qwen',
      providerType: 'openai-compatible',
      reasoningEnabled: true,
    };
    const preset = {
      id: 'preset_balanced',
      maxOutputTokens: 256,
      name: 'Balanced',
      stopStrings: [],
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    };
    const character = {
      avatarAssetPath: null,
      description: 'Observant astronomer',
      exampleDialogue: '',
      firstMessage: '',
      id: 'character_1',
      name: 'Artemis',
      personality: 'Calm',
      scenario: 'Observatory',
    };
    const createdChat = {
      characterId: null,
      createdAt: '2026-04-22T00:00:00.000Z',
      id: 'chat_1',
      presetId: null,
      providerConfigId: 'provider_local',
      title: 'Chat 1',
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const finalMessages = [
      {
        chatId: 'chat_1',
        content: 'Hello there',
        createdAt: '2026-04-22T00:00:00.000Z',
        id: 'user_1',
        reasoningContent: '',
        role: 'user',
        state: 'completed',
        updatedAt: '2026-04-22T00:00:00.000Z',
      },
      {
        chatId: 'chat_1',
        content: 'Pong',
        createdAt: '2026-04-22T00:00:01.000Z',
        id: 'assistant_1',
        reasoningContent: 'Thinking...',
        role: 'assistant',
        state: 'completed',
        updatedAt: '2026-04-22T00:00:02.000Z',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/settings') && method === 'GET') {
        return new Response(JSON.stringify(settings), { status: 200 });
      }

      if (url.endsWith('/providers') && method === 'GET') {
        return new Response(JSON.stringify({ providers: [provider] }), { status: 200 });
      }

      if (url.endsWith('/characters') && method === 'GET') {
        return new Response(JSON.stringify([character]), { status: 200 });
      }

      if (url.endsWith('/presets') && method === 'GET') {
        return new Response(JSON.stringify([preset]), { status: 200 });
      }

      if (url.endsWith('/chats') && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (url.endsWith('/chats') && method === 'POST') {
        return new Response(JSON.stringify(createdChat), { status: 201 });
      }

      if (url.endsWith('/chats/chat_1/generate') && method === 'POST') {
        return createSseResponse([
          'event: response.started\n',
          'data: {"type":"response.started","chatId":"chat_1","messageId":"assistant_1"}\n\n',
          'event: reasoning.delta\n',
          'data: {"type":"reasoning.delta","chatId":"chat_1","messageId":"assistant_1","text":"Thinking..."}\n\n',
          'event: content.delta\n',
          'data: {"type":"content.delta","chatId":"chat_1","messageId":"assistant_1","text":"Pong"}\n\n',
          'event: response.completed\n',
          'data: {"type":"response.completed","chatId":"chat_1","messageId":"assistant_1"}\n\n',
        ]);
      }

      if (url.endsWith('/chats/chat_1/messages') && method === 'GET') {
        return new Response(JSON.stringify(finalMessages), { status: 200 });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { useChatStore } = await import('./chat');
    const chatStore = useChatStore();

    await chatStore.initialize();
    await chatStore.sendMessage('Hello there');

    expect(chatStore.activeChatId).toBe('chat_1');
    expect(chatStore.activeMessages).toEqual(finalMessages);
    expect(chatStore.generating).toBe(false);
  });

  it('updates and deletes characters while detaching active chats', async () => {
    const settings = {
      createdAt: '2026-04-22T00:00:00.000Z',
      defaultPresetId: null,
      defaultProviderConfigId: null,
      id: 'app_settings',
      personaAvatarAssetPath: null,
      personaDescription: '',
      personaName: 'User',
      showReasoningByDefault: false,
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const provider = {
      apiKeyEnvVar: null,
      baseUrl: 'http://127.0.0.1:8080',
      id: 'provider_local',
      model: 'qwen',
      name: 'Local qwen',
      providerType: 'openai-compatible',
      reasoningEnabled: true,
    };
    const preset = {
      id: 'preset_balanced',
      maxOutputTokens: 256,
      name: 'Balanced',
      stopStrings: [],
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    };
    const character = {
      avatarAssetPath: null,
      description: 'Observant astronomer',
      exampleDialogue: '',
      firstMessage: '',
      id: 'character_1',
      name: 'Artemis',
      personality: 'Calm',
      scenario: 'Observatory',
    };
    const chat = {
      characterId: 'character_1',
      createdAt: '2026-04-22T00:00:00.000Z',
      id: 'chat_1',
      presetId: null,
      providerConfigId: 'provider_local',
      title: 'Chat 1',
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/settings') && method === 'GET') {
        return new Response(JSON.stringify(settings), { status: 200 });
      }

      if (url.endsWith('/providers') && method === 'GET') {
        return new Response(JSON.stringify({ providers: [provider] }), { status: 200 });
      }

      if (url.endsWith('/characters') && method === 'GET') {
        return new Response(JSON.stringify([character]), { status: 200 });
      }

      if (url.endsWith('/presets') && method === 'GET') {
        return new Response(JSON.stringify([preset]), { status: 200 });
      }

      if (url.endsWith('/chats') && method === 'GET') {
        return new Response(JSON.stringify([chat]), { status: 200 });
      }

      if (url.endsWith('/chats/chat_1/messages') && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (url.endsWith('/characters/character_1') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            ...character,
            description: 'Updated description',
          }),
          { status: 200 },
        );
      }

      if (url.endsWith('/characters/character_1') && method === 'DELETE') {
        return new Response(null, { status: 204 });
      }

      if (url.endsWith('/chats/chat_1') && method === 'PATCH') {
        return new Response(
          JSON.stringify({
            ...chat,
            characterId: null,
          }),
          { status: 200 },
        );
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { useChatStore } = await import('./chat');
    const chatStore = useChatStore();

    await chatStore.initialize();
    await chatStore.updateCharacter('character_1', { description: 'Updated description' });

    expect(chatStore.characters[0]?.description).toBe('Updated description');

    await chatStore.deleteCharacter('character_1');

    expect(chatStore.characters).toEqual([]);
    expect(chatStore.activeChat?.characterId).toBeNull();
  });

  it('creates an opening assistant message without flipping it to user', async () => {
    const createdChat = {
      characterId: 'character_1',
      createdAt: '2026-04-22T00:00:00.000Z',
      id: 'chat_1',
      presetId: null,
      providerConfigId: 'provider_local',
      title: 'Chat 1',
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const openingMessage = {
      chatId: 'chat_1',
      content: 'The observatory is quiet tonight.',
      createdAt: '2026-04-22T00:00:01.000Z',
      id: 'assistant_opening',
      reasoningContent: '',
      role: 'assistant',
      state: 'completed',
      updatedAt: '2026-04-22T00:00:01.000Z',
    };

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/chats') && method === 'POST') {
        return new Response(JSON.stringify(createdChat), { status: 201 });
      }

      if (url.endsWith('/chats/chat_1/messages') && method === 'POST') {
        return new Response(JSON.stringify(openingMessage), { status: 201 });
      }

      if (url.endsWith('/chats') && method === 'GET') {
        return new Response(JSON.stringify([createdChat]), { status: 200 });
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { useChatStore } = await import('./chat');
    const chatStore = useChatStore();

    await chatStore.createAssistantMessage('The observatory is quiet tonight.');

    expect(chatStore.activeMessages).toEqual([openingMessage]);
    expect(chatStore.activeMessages[0]?.role).toBe('assistant');
  });

  it('continues the last assistant message in place', async () => {
    const settings = {
      createdAt: '2026-04-22T00:00:00.000Z',
      defaultPresetId: null,
      defaultProviderConfigId: null,
      id: 'app_settings',
      personaAvatarAssetPath: null,
      personaDescription: '',
      personaName: 'User',
      showReasoningByDefault: false,
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const provider = {
      apiKeyEnvVar: null,
      baseUrl: 'http://127.0.0.1:8080',
      id: 'provider_local',
      model: 'qwen',
      name: 'Local qwen',
      providerType: 'openai-compatible',
      reasoningEnabled: true,
    };
    const preset = {
      id: 'preset_balanced',
      maxOutputTokens: 256,
      name: 'Balanced',
      stopStrings: [],
      temperature: 0.7,
      topK: 40,
      topP: 0.9,
    };
    const chat = {
      characterId: null,
      createdAt: '2026-04-22T00:00:00.000Z',
      id: 'chat_1',
      presetId: null,
      providerConfigId: 'provider_local',
      title: 'Chat 1',
      updatedAt: '2026-04-22T00:00:00.000Z',
    };
    const initialMessages = [
      {
        chatId: 'chat_1',
        content: 'Hello there',
        createdAt: '2026-04-22T00:00:00.000Z',
        id: 'user_1',
        reasoningContent: '',
        role: 'user',
        state: 'completed',
        updatedAt: '2026-04-22T00:00:00.000Z',
      },
      {
        chatId: 'chat_1',
        content: 'Pong',
        createdAt: '2026-04-22T00:00:01.000Z',
        id: 'assistant_1',
        reasoningContent: '',
        role: 'assistant',
        state: 'completed',
        updatedAt: '2026-04-22T00:00:01.000Z',
      },
    ];
    const finalMessages = [
      initialMessages[0],
      {
        ...initialMessages[1],
        content: 'Pong again',
        state: 'completed',
        updatedAt: '2026-04-22T00:00:02.000Z',
      },
    ];

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input.toString();
      const method = init?.method ?? 'GET';

      if (url.endsWith('/settings') && method === 'GET') {
        return new Response(JSON.stringify(settings), { status: 200 });
      }

      if (url.endsWith('/providers') && method === 'GET') {
        return new Response(JSON.stringify({ providers: [provider] }), { status: 200 });
      }

      if (url.endsWith('/characters') && method === 'GET') {
        return new Response(JSON.stringify([]), { status: 200 });
      }

      if (url.endsWith('/presets') && method === 'GET') {
        return new Response(JSON.stringify([preset]), { status: 200 });
      }

      if (url.endsWith('/chats') && method === 'GET') {
        return new Response(JSON.stringify([chat]), { status: 200 });
      }

      if (url.endsWith('/chats/chat_1/messages') && method === 'GET') {
        return new Response(JSON.stringify(finalMessages), { status: 200 });
      }

      if (url.endsWith('/chats/chat_1/continue') && method === 'POST') {
        return createSseResponse([
          'event: response.started\n',
          'data: {"type":"response.started","chatId":"chat_1","messageId":"assistant_1"}\n\n',
          'event: content.delta\n',
          'data: {"type":"content.delta","chatId":"chat_1","messageId":"assistant_1","text":" again"}\n\n',
          'event: response.completed\n',
          'data: {"type":"response.completed","chatId":"chat_1","messageId":"assistant_1"}\n\n',
        ]);
      }

      throw new Error(`Unexpected request: ${method} ${url}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const { useChatStore } = await import('./chat');
    const chatStore = useChatStore();

    await chatStore.initialize();
    await chatStore.continueGeneration();

    expect(chatStore.activeMessages).toEqual(finalMessages);
    expect(chatStore.activeMessages).toHaveLength(2);
  });
});
