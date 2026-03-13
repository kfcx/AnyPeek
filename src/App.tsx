import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent
} from 'react';

import { resolveRenderer } from '@preview/renderers';

import { ShowToolbarIcon } from './components/AppIcons';
import { EmptyState } from './components/EmptyState';
import { MetadataBar } from './components/MetadataBar';
import { PreviewPane } from './components/PreviewPane';
import { Toolbar } from './components/Toolbar';
import { usePreviewWorkbench } from './hooks/usePreviewWorkbench';

function hasFiles(event: DragEvent | ReactDragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes('Files');
}

const CTRL_DOUBLE_TAP_DELAY = 360;

export default function App() {
  const workbench = usePreviewWorkbench();
  const [dragDepth, setDragDepth] = useState(0);
  const [toolbarVisible, setToolbarVisible] = useState(true);

  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const lastCtrlTapAtRef = useRef(0);
  const lastHiddenRemoteResourceIdRef = useRef('');

  const activeRenderer = useMemo(
    () => (workbench.resource ? resolveRenderer(workbench.resource) : null),
    [workbench.resource]
  );
  const hasPreview = Boolean(workbench.resource && activeRenderer);
  const showCenteredEmptyState = !hasPreview && !workbench.error;

  useEffect(() => {
    if (!toolbarVisible) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      urlInputRef.current?.focus({ preventScroll: true });
      urlInputRef.current?.select();
    });

    return () => {
      window.cancelAnimationFrame(frame);
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
          {dragDepth > 0 ? <div className="drop-overlay">松手即可打开本地文件</div> : null}

          {workbench.error ? (
            <div className="global-error" role="alert">
              <strong>请求失败</strong>
              <p>{workbench.error}</p>
              <button type="button" className="link-button compact" onClick={workbench.clearError}>
                收起
              </button>
            </div>
          ) : null}

          {hasPreview ? (
            <>
              <MetadataBar resource={workbench.resource!} />
              <PreviewPane resource={workbench.resource!} />
            </>
          ) : (
            <EmptyState />
          )}
        </section>
      </main>
    </div>
  );
}
