import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { importCharacterFile } from './character-import';

function createPngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const chunkType = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);

  return Buffer.concat([length, chunkType, data, crc]);
}

function createMinimalCharacterPng(base64Payload: string): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);

  ihdr.writeUInt32BE(1, 0);
  ihdr.writeUInt32BE(1, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;

  const textPayload = Buffer.concat([Buffer.from('chara\0', 'utf8'), Buffer.from(base64Payload, 'utf8')]);

  return Buffer.concat([
    signature,
    createPngChunk('IHDR', ihdr),
    createPngChunk('tEXt', textPayload),
    createPngChunk('IEND', Buffer.alloc(0)),
  ]);
}

describe('importCharacterFile', () => {
  let mediaRoot = '';

  afterEach(async () => {
    if (mediaRoot) {
      await rm(mediaRoot, { force: true, recursive: true });
      mediaRoot = '';
    }
  });

  it('imports a JSON character definition', async () => {
    mediaRoot = await mkdtemp(join(tmpdir(), 'forward-character-json-'));

    const file = new File(
      [
        JSON.stringify({
          description: 'Observant astronomer',
          first_mes: 'The observatory is quiet tonight.',
          mes_example: 'Artemis peers into the dark.',
          name: 'Artemis',
          personality: 'Calm and curious',
          scenario: 'Watching the meteor shower',
        }),
      ],
      'artemis.json',
      { type: 'application/json' },
    );

    const imported = await importCharacterFile(
      {
        appPassword: 'secret',
        databasePath: ':memory:',
        defaultAssistantSystemPrompt: 'You are a helpful assistant.',
        defaultProviderApiKeyEnvVar: null,
        defaultProviderBaseUrl: 'http://127.0.0.1:8080',
        defaultProviderId: 'provider_local',
        defaultProviderModel: 'qwen',
        defaultProviderName: 'Local qwen',
        defaultPresetContextLength: 4096,
        defaultPresetFrequencyPenalty: 0,
        defaultPresetId: 'preset_balanced',
        defaultPresetMaxOutputTokens: 256,
        defaultPresetMinP: 0.05,
        defaultPresetName: 'Balanced',
        defaultPresetPresencePenalty: 0,
        defaultPresetRepeatPenalty: 1,
        defaultPresetSeed: null,
        defaultPresetStopStrings: [],
        defaultPresetSystemPrompt: '',
        defaultPresetTemperature: 0.7,
        defaultPresetTopK: 40,
        defaultPresetTopP: 0.9,
        mediaRoot,
        port: 3000,
        sessionSecret: 'session-secret',
        webOrigin: 'http://127.0.0.1:4173',
      },
      file,
    );

    expect(imported).toMatchObject({
      avatarAssetPath: null,
      description: 'Observant astronomer',
      exampleDialogue: 'Artemis peers into the dark.',
      firstMessage: 'The observatory is quiet tonight.',
      name: 'Artemis',
      personality: 'Calm and curious',
      scenario: 'Watching the meteor shower',
    });
  });

  it('imports a PNG character card and persists the avatar file', async () => {
    mediaRoot = await mkdtemp(join(tmpdir(), 'forward-character-png-'));

    const payload = Buffer.from(
      JSON.stringify({
        char_name: 'Artemis',
        char_persona: 'Observant astronomer',
        example_dialogue: 'Artemis peers into the dark.',
        first_mes: 'The observatory is quiet tonight.',
        persona: 'Calm and curious',
        scenario: 'Watching the meteor shower',
      }),
      'utf8',
    ).toString('base64');
    const pngBuffer = createMinimalCharacterPng(payload);
    const file = new File([new Uint8Array(pngBuffer)], 'artemis card.png', { type: 'image/png' });

    const imported = await importCharacterFile(
      {
        appPassword: 'secret',
        databasePath: ':memory:',
        defaultAssistantSystemPrompt: 'You are a helpful assistant.',
        defaultProviderApiKeyEnvVar: null,
        defaultProviderBaseUrl: 'http://127.0.0.1:8080',
        defaultProviderId: 'provider_local',
        defaultProviderModel: 'qwen',
        defaultProviderName: 'Local qwen',
        defaultPresetContextLength: 4096,
        defaultPresetFrequencyPenalty: 0,
        defaultPresetId: 'preset_balanced',
        defaultPresetMaxOutputTokens: 256,
        defaultPresetMinP: 0.05,
        defaultPresetName: 'Balanced',
        defaultPresetPresencePenalty: 0,
        defaultPresetRepeatPenalty: 1,
        defaultPresetSeed: null,
        defaultPresetStopStrings: [],
        defaultPresetSystemPrompt: '',
        defaultPresetTemperature: 0.7,
        defaultPresetTopK: 40,
        defaultPresetTopP: 0.9,
        mediaRoot,
        port: 3000,
        sessionSecret: 'session-secret',
        webOrigin: 'http://127.0.0.1:4173',
      },
      file,
    );

    expect(imported.name).toBe('Artemis');
    expect(imported.avatarAssetPath).toContain(join('avatars', 'artemis-card-'));

    const persistedAvatar = await readFile(imported.avatarAssetPath!);

    expect(persistedAvatar.equals(pngBuffer)).toBe(true);
  });
});
