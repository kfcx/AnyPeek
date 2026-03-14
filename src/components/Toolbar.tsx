import { useRef, type RefObject } from 'react';

import type { DownloadTarget } from '@preview/core';

import {
  DownloadIcon,
  HideToolbarIcon,
  LocalFileIcon,
  PreviewIcon,
  SpinnerIcon
} from './AppIcons';

interface ToolbarProps {
  visible: boolean;
  inputValue: string;
  busy: boolean;
  downloadTarget: DownloadTarget | null;
  urlInputRef: RefObject<HTMLInputElement | null>;
  onHide(): void;
  onInputChange(value: string): void;
  onSubmit(): void;
  onPickLocalFile(file: File): void;
}

export function Toolbar({
  visible,
  inputValue,
  busy,
  downloadTarget,
  urlInputRef,
  onHide,
  onInputChange,
  onSubmit,
  onPickLocalFile
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canDownload = Boolean(downloadTarget?.href || downloadTarget?.action);

  return (
    <header className="toolbar panel" aria-hidden={!visible}>
      <form
        className={`toolbar-form ${busy ? 'is-busy' : ''}`}
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <input
          ref={urlInputRef}
          id="url-input"
          type="url"
          inputMode="url"
          autoFocus
          spellCheck={false}
          placeholder="https://github.com/kfcx/AnyPeek"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
        />

        <div className="toolbar-actions">
          <button
            type="submit"
            className="toolbar-action-button primary"
            aria-label={busy ? '处理中' : '预览'}
            title={busy ? '处理中' : '预览'}
          >
            {busy ? <SpinnerIcon className="toolbar-icon is-spinning" /> : <PreviewIcon className="toolbar-icon" />}
          </button>
          <button
            type="button"
            className="toolbar-action-button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="打开本地文件"
            title="打开本地文件"
          >
            <LocalFileIcon className="toolbar-icon" />
          </button>
          {canDownload ? (
            downloadTarget?.action ? (
              <button
                type="button"
                className="toolbar-action-button secondary"
                onClick={() => void downloadTarget.action?.()}
                aria-label={downloadTarget.label}
                title={downloadTarget.label}
              >
                <DownloadIcon className="toolbar-icon" />
              </button>
            ) : (
              <a
                className="toolbar-action-button secondary"
                href={downloadTarget?.href}
                download={downloadTarget?.fileName}
                aria-label={downloadTarget?.label}
                title={downloadTarget?.label}
              >
                <DownloadIcon className="toolbar-icon" />
              </a>
            )
          ) : null}
          <button
            type="button"
            className="toolbar-action-button"
            onClick={onHide}
            title="隐藏工具栏（Esc / 双击 Ctrl）"
            aria-label="隐藏工具栏"
          >
            <HideToolbarIcon className="toolbar-icon" />
          </button>
        </div>
      </form>

      <input
        ref={fileInputRef}
        hidden
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onPickLocalFile(file);
          }
          event.currentTarget.value = '';
        }}
      />
    </header>
  );
}
