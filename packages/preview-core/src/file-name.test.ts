import { describe, expect, it } from 'vitest';

import { parseContentDispositionFilename, sanitizeFileName } from './file-name';

describe('file name helpers', () => {
  it('extracts filename from RFC 5987 content disposition', () => {
    expect(
      parseContentDispositionFilename("attachment; filename*=UTF-8''report%20final.docx")
    ).toBe('report final.docx');
  });

  it('sanitizes invalid path characters', () => {
    expect(sanitizeFileName('a:b/c\\d*e?f\"g<h>i|j')).toBe('a_b_c_d_e_f_g_h_i_j');
  });
});
