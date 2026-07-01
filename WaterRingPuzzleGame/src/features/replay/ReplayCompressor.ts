/**
 * ReplayCompressor — full implementation (Epic 15)
 *
 * Compresses ReplayData for storage and transmission.
 *
 * Uses a pure-JS base64 encoding approach compatible with React Native
 * (no Node.js Buffer dependency). Replace with native LZ4 binding
 * (e.g. react-native-lz4) once available in the project for better ratios.
 */

import type { ReplayData } from './ReplayRecorder';

export interface CompressedReplay {
  /** Schema version — bump when compression format changes. */
  version: number; // = 1
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatio: number;
  /** Base64-encoded compressed bytes. */
  data: string;
}

// ---------------------------------------------------------------------------
// Base64 helpers (React Native compatible, no Node.js Buffer)
// ---------------------------------------------------------------------------

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Encode a UTF-8 string to base64 without Buffer. */
function utf8ToBase64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let result = '';
  const len = bytes.length;
  for (let i = 0; i < len; i += 3) {
    const b0 = bytes[i];
    const b1 = i + 1 < len ? bytes[i + 1] : 0;
    const b2 = i + 2 < len ? bytes[i + 2] : 0;
    result += BASE64_CHARS[(b0 >> 2) & 0x3f];
    result += BASE64_CHARS[((b0 << 4) | (b1 >> 4)) & 0x3f];
    result += i + 1 < len ? BASE64_CHARS[((b1 << 2) | (b2 >> 6)) & 0x3f] : '=';
    result += i + 2 < len ? BASE64_CHARS[b2 & 0x3f] : '=';
  }
  return result;
}

/** Decode a base64 string to UTF-8 without Buffer. */
function base64ToUtf8(base64: string): string {
  const lookup = new Uint8Array(128);
  for (let i = 0; i < BASE64_CHARS.length; i++) {
    lookup[BASE64_CHARS.charCodeAt(i)] = i;
  }

  const stripped = base64.replace(/=+$/, '');
  const byteLen = (stripped.length * 3) >> 2;
  const bytes = new Uint8Array(byteLen);
  let p = 0;

  for (let i = 0; i < stripped.length; i += 4) {
    const a = lookup[stripped.charCodeAt(i)];
    const b = lookup[stripped.charCodeAt(i + 1)];
    const c = lookup[stripped.charCodeAt(i + 2)];
    const d = lookup[stripped.charCodeAt(i + 3)];
    bytes[p++] = (a << 2) | (b >> 4);
    if (p < byteLen) bytes[p++] = ((b << 4) | (c >> 2)) & 0xff;
    if (p < byteLen) bytes[p++] = ((c << 6) | d) & 0xff;
  }

  const decoder = new TextDecoder();
  return decoder.decode(bytes);
}

/** Compute byte length of a UTF-8 string without Buffer. */
function utf8ByteLength(str: string): number {
  const encoder = new TextEncoder();
  return encoder.encode(str).length;
}

// ---------------------------------------------------------------------------
// ReplayCompressor
// ---------------------------------------------------------------------------

export class ReplayCompressor {
  // -------------------------------------------------------------------------
  // compress
  // -------------------------------------------------------------------------

  compress(replay: ReplayData): CompressedReplay {
    const json = JSON.stringify(replay);
    const originalSizeBytes = utf8ByteLength(json);

    // base64 of UTF-8 bytes — ~1.33x the raw size, but avoids binary
    // transmission issues and pairs cleanly with the decompressor.
    const encoded = utf8ToBase64(json);
    const compressedSizeBytes = utf8ByteLength(encoded);

    const compressionRatio =
      originalSizeBytes > 0 ? compressedSizeBytes / originalSizeBytes : 1;

    return {
      version: 1,
      originalSizeBytes,
      compressedSizeBytes,
      compressionRatio,
      data: encoded,
    };
  }

  // -------------------------------------------------------------------------
  // decompress
  // -------------------------------------------------------------------------

  decompress(compressed: CompressedReplay): ReplayData {
    if (compressed.version !== 1) {
      throw new Error(
        `[ReplayCompressor] Unsupported compressed replay version: ${compressed.version}`,
      );
    }

    if (!compressed.data || typeof compressed.data !== 'string') {
      throw new Error('[ReplayCompressor] Missing or invalid compressed data field.');
    }

    let json: string;
    try {
      json = base64ToUtf8(compressed.data);
    } catch (e) {
      throw new Error(
        `[ReplayCompressor] Failed to decode base64 data — replay may be corrupted: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    let replay: ReplayData;
    try {
      replay = JSON.parse(json) as ReplayData;
    } catch (e) {
      throw new Error(
        `[ReplayCompressor] Failed to parse replay JSON — data may be truncated or corrupted: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }

    if (replay.version !== 1) {
      throw new Error(
        `[ReplayCompressor] Unsupported ReplayData version: ${replay.version}`,
      );
    }

    return replay;
  }

  // -------------------------------------------------------------------------
  // estimateCompressionRatio (static)
  // -------------------------------------------------------------------------

  /**
   * Rough estimate of compression ratio for a given event count.
   * With a real LZ4 compressor the typical ratio is ~0.4 (60% size reduction).
   * With the current base64 fallback it is ~1.33.
   *
   * Pass `useLZ4 = true` when the native module is available.
   */
  static estimateCompressionRatio(
    _eventCount: number,
    useLZ4 = false,
  ): number {
    return useLZ4 ? 0.4 : 1.33;
  }
}

export const replayCompressor = new ReplayCompressor();
