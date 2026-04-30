import {
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type MutableRefObject,
  type RefObject
} from 'react';

import { resolveRenderer } from '@preview/renderers';

import { ShowToolbarIcon } from './components/AppIcons';
import { EmptyState } from './components/EmptyState';
import { MetadataBar } from './components/MetadataBar';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { WindowRail } from './components/WindowRail';
import { usePreviewWorkbench } from './hooks/usePreviewWorkbench';
import { listenTauriWindowFocusChanged } from './platform/tauri';

function hasFiles(event: DragEvent | ReactDragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

const CTRL_DOUBLE_TAP_DELAY = 360;

function cancelScheduledFocus(frameRef: MutableRefObject<number | null>): void {
  if (frameRef.current == null) {
    return;
  }

  window.cancelAnimationFrame(frameRef.current);
  frameRef.current = null;
}

function scheduleUrlInputFocus(
  inputRef: RefObject<HTMLInputElement | null>,
  frameRef: MutableRefObject<number | null>
): void {
  cancelScheduledFocus(frameRef);
  frameRef.current = window.requestAnimationFrame(() => {
    frameRef.current = null;
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.focus({ preventScroll: true });
    if (document.activeElement === input) {
      input.select();
    }
  });
}

export default function App() {
  const workbench = usePreviewWorkbench();
  const [dragDepth, setDragDepth] = useState(0);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [railCollapsed, setRailCollapsed] = useState(false);

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const focusFrameRef = useRef<number | null>(null);
  const lastCtrlTapAtRef = useRef(0);
  const lastHiddenRemoteResourceIdRef = useRef('');
  const shouldRestoreToolbarOnActivateRef = useRef(false);

  const activeRenderer = useMemo(
    () => (workbench.resource ? resolveRenderer(workbench.resource) : null),
    [workbench.resource]
  );
  const hasPreview = Boolean(workbench.resource && activeRenderer);
  const showCenteredEmptyState = !hasPreview;
  const markToolbarForRestore = useEffectEvent(() => {
    shouldRestoreToolbarOnActivateRef.current = true;
  });
  const restoreToolbarAfterActivate = useEffectEvent(() => {
    if (!shouldRestoreToolbarOnActivateRef.current) {
      return;
    }

    shouldRestoreToolbarOnActivateRef.current = false;
    setToolbarVisible(true);
    scheduleUrlInputFocus(urlInputRef, focusFrameRef);
  });

  useEffect(() => {
    if (!toolbarVisible) {
      return;
    }

    scheduleUrlInputFocus(urlInputRef, focusFrameRef);
    return () => {
      cancelScheduledFocus(focusFrameRef);
    };
  }, [toolbarVisible]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && toolbarVisible) {
        event.preventDefault();
        setToolbarVisible(false);
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== 'Control') {
        return;
      }

      const now = performance.now();
      if (now - lastCtrlTapAtRef.current <= CTRL_DOUBLE_TAP_DELAY) {
        lastCtrlTapAtRef.current = 0;
        setToolbarVisible((current) => !current);
        return;
      }

      lastCtrlTapAtRef.current = now;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [toolbarVisible]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        markToolbarForRestore();
        return;
      }

      restoreToolbarAfterActivate();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      cancelScheduledFocus(focusFrameRef);
    };
  }, []);

  useEffect(() => {
    let disposed = false;
    let unlisten: (() => void) | null = null;

    void listenTauriWindowFocusChanged((focused) => {
      if (focused) {
        restoreToolbarAfterActivate();
        return;
      }

      markToolbarForRestore();
    })
      .then((nextUnlisten) => {
        if (disposed) {
          nextUnlisten?.();
          return;
        }

        unlisten = nextUnlisten;
      })
      .catch((error) => {
        console.warn('桌面窗口焦点监听初始化失败。', error);
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (!workbench.resource || workbench.busy || workbench.error || workbench.resource.source !== 'remote') {
      return;
    }

    if (lastHiddenRemoteResourceIdRef.current === workbench.resource.id) {
      return;
    }

    lastHiddenRemoteResourceIdRef.current = workbench.resource.id;
    setToolbarVisible(false);
  }, [workbench.busy, workbench.error, workbench.resource]);

  return (
    <div className={`app-shell ${dragDepth > 0 ? 'is-dragging' : ''} ${toolbarVisible ? '' : 'toolbar-hidden'}`}>
      <div className="backdrop" />

      <main className="shell-layout">
        <div className={`workbench-layout ${railCollapsed ? 'is-rail-collapsed' : ''}`}>
          <WindowRail
            windows={workbench.windows}
            activeWindowId={workbench.activeWindowId}
            history={workbench.history}
            collapsed={railCollapsed}
            onToggleCollapsed={() => setRailCollapsed((current) => !current)}
            onCreateWindow={() => {
              workbench.createWindow();
              setToolbarVisible(true);
            }}
            onSelectWindow={workbench.selectWindow}
            onCloseWindow={workbench.closeWindow}
            onOpenHistory={(entry) => void workbench.openHistoryEntry(entry)}
            onRemoveHistoryEntry={workbench.removeHistoryEntry}
            onClearHistory={workbench.clearHistory}
          />

          <section
            className={`workspace panel ${showCenteredEmptyState ? 'is-empty-only' : ''}`}
            onDragEnter={(event) => {
              if (!hasFiles(event)) {
                return;
              }
              event.preventDefault();
              setDragDepth((value) => value + 1);
            }}
            onDragOver={(event) => {
              if (!hasFiles(event)) {
                return;
              }
              event.preventDefault();
              event.dataTransfer.dropEffect = 'copy';
            }}
            onDragLeave={(event) => {
              if (!hasFiles(event)) {
                return;
              }
              event.preventDefault();
              setDragDepth((value) => Math.max(0, value - 1));
            }}
            onDrop={(event) => {
              if (!hasFiles(event)) {
                return;
              }
              event.preventDefault();
              setDragDepth(0);
              const file = event.dataTransfer.files?.[0];
              if (file) {
                void workbench.previewLocal(file);
              }
            }}
          >
            <Toolbar
              visible={toolbarVisible}
              inputValue={workbench.inputValue}
              busy={workbench.busy}
              downloadTarget={workbench.downloadTarget}
              urlInputRef={urlInputRef}
              onHide={() => setToolbarVisible(false)}
              onInputChange={workbench.setInputValue}
              onSubmit={() => void workbench.previewRemote()}
              onPickLocalFile={(file) => void workbench.previewLocal(file)}
            />

            <button
              type="button"
              className="toolbar-reveal"
              aria-label="显示工具栏"
              title="显示工具栏（双击 Ctrl）"
              onPointerEnter={() => setToolbarVisible(true)}
              onClick={() => setToolbarVisible(true)}
            >
              <ShowToolbarIcon className="toolbar-icon" />
            </button>

            {dragDepth > 0 ? <div className="drop-overlay">松手即可打开本地文件</div> : null}

            {hasPreview ? (
              <>
                <MetadataBar resource={workbench.resource!} />
                <PreviewPane resource={workbench.resource!} />
              </>
            ) : (
              <EmptyState />
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
