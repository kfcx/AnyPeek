export const IMAGE_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'webp',
  'svg',
  'bmp',
  'ico',
  'avif'
]);

export const AUDIO_EXTENSIONS = new Set([
  'mp3',
  'wav',
  'ogg',
  'aac',
  'm4a',
  'flac',
  'opus'
]);

export const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'ogv']);
export const MARKDOWN_EXTENSIONS = new Set(['md', 'markdown', 'mdx']);
export const HTML_EXTENSIONS = new Set(['html', 'htm', 'xhtml']);
export const JSON_EXTENSIONS = new Set(['json', 'map', 'geojson']);
export const LEGACY_OFFICE_EXTENSIONS = new Set(['doc', 'ppt', 'pps', 'pot']);

export const TEXT_EXTENSIONS = new Set([
  'txt',
  'text',
  'log',
  'csv',
  'tsv',
  'xml',
  'yaml',
  'yml',
  'ini',
  'cfg',
  'conf',
  'ts',
  'tsx',
  'js',
  'jsx',
  'css',
  'scss',
  'less',
  'py',
  'java',
  'go',
  'rs',
  'sh',
  'sql',
  'toml',
  'c',
  'cc',
  'cpp',
  'h',
  'hpp',
  'env',
  'gitignore'
]);

export const SPREADSHEET_EXTENSIONS = new Set([
  'xlsx',
  'xls',
  'xlsm',
  'xlsb',
  'ods'
]);

export const ZIP_SPREADSHEET_EXTENSIONS = new Set(['xlsx', 'xlsm', 'xlsb', 'ods']);

export const PRESENTATION_EXTENSIONS = new Set(['pptx', 'pptm', 'ppsx', 'potx']);

export const DOCX_CONTENT_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

export const LEGACY_OFFICE_CONTENT_TYPES = new Set([
  'application/msword',
  'application/vnd.ms-powerpoint'
]);

export const PRESENTATION_CONTENT_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-powerpoint.presentation.macroenabled.12',
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow',
  'application/vnd.openxmlformats-officedocument.presentationml.template'
]);

export const SPREADSHEET_CONTENT_TYPES = new Set([
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.ms-excel.sheet.binary.macroenabled.12',
  'application/vnd.oasis.opendocument.spreadsheet'
]);

export const TEXT_CONTENT_TYPES = new Set([
  'application/javascript',
  'application/json',
  'application/ld+json',
  'application/xml',
  'application/x-sh',
  'application/x-yaml',
  'application/yaml',
  'text/cache-manifest',
  'text/css',
  'text/csv',
  'text/html',
  'text/javascript',
  'text/jsx',
  'text/markdown',
  'text/plain',
  'text/tab-separated-values',
  'text/tsx',
  'text/xml'
]);
