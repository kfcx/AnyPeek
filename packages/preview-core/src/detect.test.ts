import { describe, expect, it } from 'vitest';

import { determinePreviewKind } from './detect';

const textSample = new TextEncoder().encode('hello world');
const binarySample = new Uint8Array([0x00, 0x01, 0x7f, 0xff]);
const zipSample = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x06, 0x00]);
const cfbSample = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

describe('determinePreviewKind', () => {
  it('recognizes ordinary text resources', () => {
    expect(
      determinePreviewKind({
        fileName: 'demo.ts',
        fileExtension: 'ts',
        contentType: 'text/plain; charset=utf-8',
        sampleBytes: textSample
      })
    ).toBe('text');
  });

  it('routes legacy office documents to native fallback lane', () => {
    expect(
      determinePreviewKind({
        fileName: 'legacy.doc',
        fileExtension: 'doc',
        contentType: 'application/msword',
        sniffedMime: 'application/x-cfb',
        sniffedExt: 'cfb',
        sampleBytes: binarySample
      })
    ).toBe('legacy-office');
  });

  it('keeps xls inside spreadsheet renderer', () => {
    expect(
      determinePreviewKind({
        fileName: 'report.xls',
        fileExtension: 'xls',
        contentType: 'application/vnd.ms-excel',
        sniffedMime: 'application/x-cfb',
        sniffedExt: 'cfb',
        sampleBytes: cfbSample
      })
    ).toBe('spreadsheet');
  });

  it('routes csv to text even when the server labels it as excel', () => {
    expect(
      determinePreviewKind({
        fileName: 'report.csv',
        fileExtension: 'csv',
        contentType: 'application/vnd.ms-excel',
        sampleBytes: textSample
      })
    ).toBe('text');
  });

  it('ignores untrusted url suffixes when only the response type says text', () => {
    expect(
      determinePreviewKind({
        fileName: 'download.docx',
        fileExtension: '',
        contentType: 'text/plain',
        sampleBytes: textSample
      })
    ).toBe('text');
  });

  it('does not let zip magic override a docx file name', () => {
    expect(
      determinePreviewKind({
        fileName: 'test.docx',
        fileExtension: 'docx',
        contentType: 'application/zip',
        sniffedMime: 'application/zip',
        sniffedExt: 'zip',
        sampleBytes: zipSample
      })
    ).toBe('docx');
  });

  it('does not let zip magic override an xlsx file name', () => {
    expect(
      determinePreviewKind({
        fileName: 'test.xlsx',
        fileExtension: 'xlsx',
        contentType: 'application/octet-stream',
        sniffedMime: 'application/zip',
        sniffedExt: 'zip',
        sampleBytes: zipSample
      })
    ).toBe('spreadsheet');
  });

  it('does not let zip magic override a pptx file name', () => {
    expect(
      determinePreviewKind({
        fileName: 'test.pptx',
        fileExtension: 'pptx',
        contentType: 'application/octet-stream',
        sniffedMime: 'application/zip',
        sniffedExt: 'zip',
        sampleBytes: zipSample
      })
    ).toBe('presentation');
  });

  it('does not route fake docx text files into the docx renderer', () => {
    expect(
      determinePreviewKind({
        fileName: '1mb.docx',
        fileExtension: 'docx',
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sampleBytes: new TextEncoder().encode('examplefile.com - Sample Files')
      })
    ).toBe('text');
  });

  it('does not route fake legacy office files into the native office lane', () => {
    expect(
      determinePreviewKind({
        fileName: 'fake.doc',
        fileExtension: 'doc',
        contentType: 'application/msword',
        sampleBytes: textSample
      })
    ).toBe('text');
  });
});
