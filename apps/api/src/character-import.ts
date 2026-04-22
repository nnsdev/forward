import { mkdir, writeFile } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

import type { CreateCharacterInput } from '@forward/shared';

import type { AppConfig } from './config';

interface ParsedCharacterCard {
  data: CreateCharacterInput;
  sourceImageBuffer?: Buffer;
}

function toUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function sanitizeFileStem(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'character';
}

function normalizeImportedCharacter(raw: Record<string, unknown>): CreateCharacterInput {
  return {
    avatarAssetPath: null,
    description: String(raw.description ?? raw.description_template ?? raw.char_persona ?? ''),
    exampleDialogue: String(raw.exampleDialogue ?? raw.mes_example ?? raw.example_dialogue ?? ''),
    firstMessage: String(raw.firstMessage ?? raw.first_mes ?? ''),
    name: String(raw.name ?? raw.char_name ?? 'Imported character'),
    personality: String(raw.personality ?? raw.persona ?? ''),
    scenario: String(raw.scenario ?? ''),
  };
}

function parseJsonCharacterPayload(payload: string): ParsedCharacterCard {
  return {
    data: normalizeImportedCharacter(JSON.parse(payload) as Record<string, unknown>),
  };
}

function extractTextChunkPayload(bytes: Uint8Array, keyword: string): string | null {
  const signatureLength = 8;
  let offset = signatureLength;

  while (offset + 8 <= bytes.length) {
    const length = new DataView(bytes.buffer, bytes.byteOffset + offset, 4).getUint32(0);
    offset += 4;

    const type = toUtf8(bytes.slice(offset, offset + 4));
    offset += 4;

    const chunkData = bytes.slice(offset, offset + length);
    offset += length + 4;

    if (type === 'tEXt') {
      const nullIndex = chunkData.indexOf(0);

      if (nullIndex !== -1) {
        const chunkKeyword = toUtf8(chunkData.slice(0, nullIndex));

        if (chunkKeyword === keyword) {
          return toUtf8(chunkData.slice(nullIndex + 1));
        }
      }
    }

    if (type === 'iTXt') {
      const firstNull = chunkData.indexOf(0);

      if (firstNull === -1) {
        continue;
      }

      const chunkKeyword = toUtf8(chunkData.slice(0, firstNull));

      if (chunkKeyword !== keyword) {
        continue;
      }

      let cursor = firstNull + 1;
      const compressionFlag = chunkData[cursor] ?? 0;
      cursor += 2;

      while (cursor < chunkData.length && chunkData[cursor] !== 0) {
        cursor += 1;
      }

      cursor += 1;

      while (cursor < chunkData.length && chunkData[cursor] !== 0) {
        cursor += 1;
      }

      cursor += 1;

      const textPayload = chunkData.slice(cursor);

      if (compressionFlag !== 0) {
        continue;
      }

      return toUtf8(textPayload);
    }
  }

  return null;
}

function parsePngCharacterPayload(buffer: Buffer): ParsedCharacterCard {
  const textPayload = extractTextChunkPayload(buffer, 'chara');

  if (!textPayload) {
    throw new Error('PNG character card metadata not found');
  }

  const decoded = Buffer.from(textPayload, 'base64').toString('utf8');

  return {
    data: normalizeImportedCharacter(JSON.parse(decoded) as Record<string, unknown>),
    sourceImageBuffer: buffer,
  };
}

async function persistAvatar(config: AppConfig, filename: string, buffer: Buffer): Promise<string> {
  const avatarDir = resolve(config.mediaRoot, 'avatars');

  await mkdir(avatarDir, { recursive: true });

  const extension = extname(filename) || '.png';
  const finalName = `${sanitizeFileStem(basename(filename, extension))}-${crypto.randomUUID()}${extension}`;
  const fullPath = join(avatarDir, finalName);

  await writeFile(fullPath, buffer);

  return fullPath;
}

export async function importCharacterFile(config: AppConfig, file: File): Promise<CreateCharacterInput> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = file.name || 'character';

  let parsed: ParsedCharacterCard;

  if (file.type === 'application/json' || filename.endsWith('.json')) {
    parsed = parseJsonCharacterPayload(bytes.toString('utf8'));
  } else if (file.type === 'image/png' || filename.endsWith('.png')) {
    parsed = parsePngCharacterPayload(bytes);
  } else {
    throw new Error('Unsupported character import format');
  }

  if (parsed.sourceImageBuffer) {
    parsed.data.avatarAssetPath = await persistAvatar(config, filename, parsed.sourceImageBuffer);
  }

  return parsed.data;
}
