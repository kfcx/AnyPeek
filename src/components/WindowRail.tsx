import { formatBytes } from '@preview/core';

import type { PreviewHistoryEntry } from '../hooks/usePreviewHistory';
import type { PreviewWindowState } from '../hooks/usePreviewWorkbench';
import {
  CloseIcon,
  CollapseSidebarIcon,
  ExpandSidebarIcon,
  HistoryIcon,
  NewWindowIcon,
  SpinnerIcon
} from './AppIcons';

interface WindowRailProps {
  windows: PreviewWindowState[];
  activeWindowId: string;
  history: PreviewHistoryEntry[];
  collapsed: boolean;
  onToggleCollapsed(): void;
  onCreateWindow(): void;
  onSelectWindow(windowId: string): void;
  onCloseWindow(windowId: string): void;
  onOpenHistory(entry: PreviewHistoryEntry): void;
  onRemoveHistoryEntry(id: string): void;
  onClearHistory(): void;
}

const historyDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit'
});

function getWindowTitle(windowState: PreviewWindowState, index: number): string {
  return windowState.resource?.fileName || windowState.inputValue.trim() || `新窗口 ${index + 1}`;
}

function getWindowMeta(windowState: PreviewWindowState): string {
  if (windowState.busy) {
    return '载入中';
  }

  if (windowState.error) {
    return '打开失败';
  }

  if (!windowState.resource) {
    return '空白';
  }

  return `${windowState.resource.source === 'remote' ? '远程' : '本地'} · ${windowState.resource.kind} · ${formatBytes(
    windowState.resource.size
  )}`;
}

function getHistoryMeta(entry: PreviewHistoryEntry): string {
  return `${entry.source === 'remote' ? '远程' : '本地'} · ${entry.kind} · ${historyDateFormatter.format(
    entry.openedAt
  )}`;
}

export function WindowRail({
  windows,
  activeWindowId,
  history,
  collapsed,
  onToggleCollapsed,
  onCreateWindow,
  onSelectWindow,
  onCloseWindow,
  onOpenHistory,
  onRemoveHistoryEntry,
  onClearHistory
}: WindowRailProps) {
  if (collapsed) {
    return (
      <aside className="window-rail panel is-collapsed" aria-label="预览窗口">
        <button
          type="button"
          className="rail-icon-button"
          onClick={onToggleCollapsed}
          aria-label="展开侧边栏"
          title="展开侧边栏"
        >
          <ExpandSidebarIcon className="rail-icon" />
        </button>
        <button
          type="button"
          className="rail-icon-button primary"
          onClick={onCreateWindow}
          aria-label="新建窗口"
          title="新建窗口"
        >
          <NewWindowIcon className="rail-icon" />
        </button>
        <div className="rail-collapsed-window-list" aria-label="窗口切换">
          {windows.map((windowState, index) => {
            const selected = windowState.id === activeWindowId;
            const title = getWindowTitle(windowState, index);

            return (
              <button
                key={windowState.id}
                type="button"
                className={`rail-collapsed-window-button ${selected ? 'is-active' : ''} ${
                  windowState.busy ? 'is-busy' : ''
                }`}
                onClick={() => onSelectWindow(windowState.id)}
                aria-label={`切换到 ${title}`}
                aria-current={selected ? 'page' : undefined}
                title={title}
              >
                {windowState.busy ? <SpinnerIcon className="rail-spinner" /> : null}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="rail-icon-button"
          onClick={onToggleCollapsed}
          aria-label={`展开历史，当前 ${history.length} 条`}
          title={`历史：${history.length} 条`}
        >
          <HistoryIcon className="rail-icon" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="window-rail panel" aria-label="预览窗口">
      <section className="rail-section">
        <header className="rail-section-header">
          <span>窗口</span>
          <div className="rail-header-actions">
            <button
              type="button"
              className="rail-icon-button"
              onClick={onToggleCollapsed}
              aria-label="收起侧边栏"
              title="收起侧边栏"
            >
              <CollapseSidebarIcon className="rail-icon" />
            </button>
            <button
              type="button"
              className="rail-icon-button primary"
              onClick={onCreateWindow}
              aria-label="新建窗口"
              title="新建窗口"
            >
              <NewWindowIcon className="rail-icon" />
            </button>
          </div>
        </header>

        <ol className="rail-list window-list">
          {windows.map((windowState, index) => {
            const selected = windowState.id === activeWindowId;
            const title = getWindowTitle(windowState, index);

            return (
              <li key={windowState.id} className={`window-item ${selected ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="window-switch"
                  onClick={() => onSelectWindow(windowState.id)}
                  aria-current={selected ? 'page' : undefined}
                  title={title}
                >
                  <span className={`window-state-dot ${windowState.busy ? 'is-busy' : ''}`} aria-hidden="true">
                    {windowState.busy ? <SpinnerIcon className="rail-spinner" /> : null}
                  </span>
                  <span className="rail-item-copy">
                    <strong>{title}</strong>
                    <span>{getWindowMeta(windowState)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="rail-icon-button"
                  onClick={() => onCloseWindow(windowState.id)}
                  aria-label={`关闭 ${title}`}
                  title="关闭窗口"
                >
                  <CloseIcon className="rail-icon" />
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="rail-section history-section">
        <header className="rail-section-header">
          <span>历史</span>
          <div className="rail-header-actions">
            <HistoryIcon className="rail-heading-icon" />
            {history.length > 0 ? (
              <button type="button" className="rail-text-button" onClick={onClearHistory}>
                清空
              </button>
            ) : null}
          </div>
        </header>

        {history.length > 0 ? (
          <ol className="rail-list history-list">
            {history.map((entry) => {
              const canOpen = entry.source === 'remote';

              return (
                <li key={entry.id} className="history-item">
                  <button
                    type="button"
                    className="history-entry"
                    disabled={!canOpen}
                    onClick={() => onOpenHistory(entry)}
                    title={canOpen ? entry.inputValue : entry.fileName}
                  >
                    <span className="rail-item-copy">
                      <strong>{entry.title}</strong>
                      <span>{getHistoryMeta(entry)}</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    className="rail-icon-button"
                    onClick={() => onRemoveHistoryEntry(entry.id)}
                    aria-label={`删除 ${entry.title}`}
                    title="删除历史"
                  >
                    <CloseIcon className="rail-icon" />
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rail-empty">暂无历史</div>
        )}
      </section>
    </aside>
  );
}
