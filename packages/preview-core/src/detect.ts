import {
  AUDIO_EXTENSIONS,
  DOCX_CONTENT_TYPES,
  HTML_EXTENSIONS,
  IMAGE_EXTENSIONS,
  JSON_EXTENSIONS,
  LEGACY_OFFICE_CONTENT_TYPES,
  LEGACY_OFFICE_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
  PRESENTATION_CONTENT_TYPES,
  PRESENTATION_EXTENSIONS,
  SPREADSHEET_CONTENT_TYPES,
  TEXT_CONTENT_TYPES,
  TEXT_EXTENSIONS,
  ZIP_SPREADSHEET_EXTENSIONS,
  VIDEO_EXTENSIONS
} from './collections';
import { countChar, normalizeContentType } from './bytes';
import type { PreviewKind, PreviewProbeInput } from './types';

const GENERIC_BINARY_CONTENT_TYPES = new Set([
  'application/octet-stream',
  'application/zip',
  'application/x-zip',
  'application/x-zip-compressed'
]);

const ZIP_CONTAINER_HINT_EXTENSIONS = new Set([
  'docx',
  'xlsx',
  'xlsm',
  'xlsb',
  'ods',
  'pptx',
  'pptm',
  'ppsx',
  'potx'
]);

const COMPOUND_BINARY_HINT_EXTENSIONS = new Set(['doc', 'ppt', 'pps', 'pot', 'xls']);

const DELIMITED_TEXT_EXTENSIONS = new Set(['csv', 'tsv']);
const DELIMITED_TEXT_CONTENT_TYPES = new Set([
  'application/csv',
  'application/tab-separated-values',
  'text/csv',
  'text/tab-separated-values',
  'text/x-csv',
  'text/x-tsv'
]);

export async function sniffFileType(sampleBytes: Uint8Array): Promise<{ mime: string; ext: string } | null> {
  if (sampleBytes.length < 4) {
    return null;
  }

  const ascii = new TextDecoder('latin1').decode(sampleBytes.subarray(0, 16));

  if (ascii.startsWith('%PDF-')) {
    return { mime: 'application/pdf', ext: 'pdf' };
  }

  if (sampleBytes[0] === 0x89 && sampleBytes[1] === 0x50 && sampleBytes[2] === 0x4e && sampleBytes[3] === 0x47) {
    return { mime: 'image/png', ext: 'png' };
  }

  if (sampleBytes[0] === 0xff && sampleBytes[1] === 0xd8 && sampleBytes[2] === 0xff) {
    return { mime: 'image/jpeg', ext: 'jpg' };
  }

  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) {
    return { mime: 'image/gif', ext: 'gif' };
  }

  if (
    ascii.startsWith('RIFF') &&
    sampleBytes[8] === 0x57 &&
    sampleBytes[9] === 0x45 &&
    sampleBytes[10] === 0x42 &&
    sampleBytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' };
  }

  if (sampleBytes[0] === 0x42 && sampleBytes[1] === 0x4d) {
    return { mime: 'image/bmp', ext: 'bmp' };
  }

  if (ascii.startsWith('ID3')) {
    return { mime: 'audio/mpeg', ext: 'mp3' };
  }

  if (sampleBytes[0] === 0x4f && sampleBytes[1] === 0x67 && sampleBytes[2] === 0x67 && sampleBytes[3] === 0x53) {
    return { mime: 'audio/ogg', ext: 'ogg' };
  }

  if (sampleBytes[4] === 0x66 && sampleBytes[5] === 0x74 && sampleBytes[6] === 0x79 && sampleBytes[7] === 0x70) {
    return { mime: 'video/mp4', ext: 'mp4' };
  }

  if (sampleBytes[0] === 0x50 && sampleBytes[1] === 0x4b) {
    return { mime: 'application/zip', ext: 'zip' };
  }

  if (
    sampleBytes.length >= 8 &&
    sampleBytes[0] === 0xd0 &&
    sampleBytes[1] === 0xcf &&
    sampleBytes[2] === 0x11 &&
    sampleBytes[3] === 0xe0 &&
    sampleBytes[4] === 0xa1 &&
    sampleBytes[5] === 0xb1 &&
    sampleBytes[6] === 0x1a &&
    sampleBytes[7] === 0xe1
  ) {
    return { mime: 'application/x-cfb', ext: 'cfb' };
  }

  return null;
}

function resolveProbeContentType(input: PreviewProbeInput): string {
  const contentType = normalizeContentType(input.contentType);
  const sniffedMime = normalizeContentType(input.sniffedMime);
  const fileExtension = String(input.fileExtension ?? '').toLowerCase();

  if (!sniffedMime || sniffedMime === 'application/octet-stream') {
    return contentType;
  }

  if (GENERIC_BINARY_CONTENT_TYPES.has(sniffedMime)) {
    if (!GENERIC_BINARY_CONTENT_TYPES.has(contentType)) {
      return contentType;
    }

    if (ZIP_CONTAINER_HINT_EXTENSIONS.has(fileExtension)) {
      return contentType;
    }
  }

  return sniffedMime;
}

function resolveProbeExtension(input: PreviewProbeInput, contentType: string): string {
  const fileExtension = String(input.fileExtension ?? '').toLowerCase();
  const sniffedExtension = (input.sniffedExt ?? '').toLowerCase();

  if (!sniffedExtension) {
    return fileExtension;
  }

  if (sniffedExtension === 'zip' && ZIP_CONTAINER_HINT_EXTENSIONS.has(fileExtension)) {
    return fileExtension;
  }

  if (sniffedExtension === 'cfb' && COMPOUND_BINARY_HINT_EXTENSIONS.has(fileExtension)) {
    return fileExtension;
  }

  if (fileExtension && GENERIC_BINARY_CONTENT_TYPES.has(contentType) && ZIP_CONTAINER_HINT_EXTENSIONS.has(fileExtension)) {
    return fileExtension;
  }

  return sniffedExtension;
}

export function determinePreviewKind(input: PreviewProbeInput): PreviewKind {
  const contentType = resolveProbeContentType(input);
  const extension = resolveProbeExtension(input, contentType);
  const sniffedMime = normalizeContentType(input.sniffedMime);
  const textLikeByExtension =
    JSON_EXTENSIONS.has(extension) ||
    DELIMITED_TEXT_EXTENSIONS.has(extension) ||
    MARKDOWN_EXTENSIONS.has(extension) ||
    HTML_EXTENSIONS.has(extension) ||
    TEXT_EXTENSIONS.has(extension);
  const looksLikeZipContainer = sniffedMime === 'application/zip';
  const looksLikeCompoundBinary = sniffedMime === 'application/x-cfb';
  const prefersDocx = DOCX_CONTENT_TYPES.has(contentType) || extension === 'docx';
  const prefersPresentation = PRESENTATION_CONTENT_TYPES.has(contentType) || PRESENTATION_EXTENSIONS.has(extension);
  const prefersZipSpreadsheet =
    ZIP_SPREADSHEET_EXTENSIONS.has(extension) ||
    (SPREADSHEET_CONTENT_TYPES.has(contentType) && contentType !== 'application/vnd.ms-excel');
  const prefersBinarySpreadsheet = extension === 'xls' || contentType === 'application/vnd.ms-excel';
  const prefersLegacyOffice = LEGACY_OFFICE_CONTENT_TYPES.has(contentType) || LEGACY_OFFICE_EXTENSIONS.has(extension);

  if (contentType === 'application/pdf' || extension === 'pdf') {
    return 'pdf';
  }

  if (contentType.startsWith('image/') || IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  // Some servers label text resources such as `.ts` as MPEG transport streams via `video/mp2t`.
  // When the extension is text-like and the sampled bytes decode cleanly, prefer the text lanes.
  if (textLikeByExtension && isLikelyText(input.sampleBytes) && (contentType.startsWith('audio/') || contentType.startsWith('video/'))) {
    return JSON_EXTENSIONS.has(extension) ? 'json' : 'text';
  }

  if (contentType.startsWith('audio/') || AUDIO_EXTENSIONS.has(extension)) {
    return 'audio';
  }

  if (contentType.startsWith('video/') || VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  if (prefersDocx && looksLikeZipContainer) {
    return 'docx';
  }

  if (prefersLegacyOffice && looksLikeCompoundBinary) {
    return 'legacy-office';
  }

  if (prefersPresentation && looksLikeZipContainer) {
    return 'presentation';
  }

  if (DELIMITED_TEXT_CONTENT_TYPES.has(contentType) || DELIMITED_TEXT_EXTENSIONS.has(extension)) {
    return 'text';
  }

  if (prefersZipSpreadsheet && looksLikeZipContainer) {
    return 'spreadsheet';
  }

  if (prefersBinarySpreadsheet && looksLikeCompoundBinary) {
    return 'spreadsheet';
  }

  if (contentType === 'application/json' || contentType.endsWith('+json') || JSON_EXTENSIONS.has(extension)) {
    return 'json';
  }

  if (
    TEXT_CONTENT_TYPES.has(contentType) ||
    contentType.startsWith('text/') ||
    contentType.endsWith('+xml') ||
    contentType === 'application/xml' ||
    contentType === 'text/xml' ||
    MARKDOWN_EXTENSIONS.has(extension) ||
    HTML_EXTENSIONS.has(extension) ||
    TEXT_EXTENSIONS.has(extension)
  ) {
    return 'text';
  }

  return isLikelyText(input.sampleBytes) ? 'text' : 'hex';
}

export function isLikelyText(sampleBytes: Uint8Array): boolean {
  if (!sampleBytes.length) {
    return true;
  }

  if (hasUnicodeBom(sampleBytes)) {
    return true;
  }

  let suspicious = 0;
  const limit = Math.min(sampleBytes.length, 4096);
  for (let index = 0; index < limit; index += 1) {
    const byte = sampleBytes[index];
    if (byte === 0) {
      return false;
    }

    const isCommonControl = byte === 9 || byte === 10 || byte === 13;
    const isBinaryControl = byte < 32 && !isCommonControl;
    if (isBinaryControl || byte === 127) {
      suspicious += 1;
    }
  }

  if (suspicious / limit > 0.12) {
    return false;
  }

  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(sampleBytes);
  const replacementCount = countChar(decoded, '\uFFFD');
  return replacementCount / Math.max(decoded.length, 1) <= 0.02;
}

export function hasUnicodeBom(bytes: Uint8Array): boolean {
  return (
    (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) ||
    (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) ||
    (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff)
  );
}

export function extractCharset(contentType: string): string {
  const match = contentType.match(/charset=([^;]+)/i);
  return match?.[1]?.trim().toLowerCase() ?? '';
}

export function resolveTextEncoding(bytes: Uint8Array, charset: string): string {
  if (charset) {
    return charset;
  }

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return 'utf-16le';
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return 'utf-16be';
  }

  return 'utf-8';
}
