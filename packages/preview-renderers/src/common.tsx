import type { PropsWithChildren } from 'react';

export function LoadingCard({ children }: PropsWithChildren) {
  return (
    <section className="loading-stage">
      <CanvasLoadingIndicator />
      <span className="visually-hidden">{children ?? '加载中'}</span>
    </section>
  );
}

export function CanvasLoadingIndicator() {
  return (
    <div className="canvas-loader" role="status" aria-label="正在加载预览">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        aria-hidden="true"
      >
        <circle className="canvas-loader-ring" cx="12" cy="12" r="8.25" />
        <path
          className="canvas-loader-arc"
          d="M12 3.75a8.25 8.25 0 0 1 6.74 3.52"
        />
      </svg>
    </div>
  );
}

export function ErrorCard({ message }: { message: string }) {
  return (
    <div className="status-card is-error">
      <strong>预览失败</strong>
      <p>{message}</p>
    </div>
  );
}
