import type { SVGProps } from 'react';

export type AppIconProps = SVGProps<SVGSVGElement>;

function IconBase({ strokeWidth = 2, ...props }: AppIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}

export function PreviewIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M2.75 12s3.65-5.25 9.25-5.25S21.25 12 21.25 12 17.6 17.25 12 17.25 2.75 12 2.75 12Z" />
      <circle cx="12" cy="12" r="2.35" />
    </IconBase>
  );
}

export function LocalFileIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M7.25 3.75h6.5l4.5 4.5v9.5a2.5 2.5 0 0 1-2.5 2.5h-8.5a2.5 2.5 0 0 1-2.5-2.5V6.25a2.5 2.5 0 0 1 2.5-2.5Z" />
      <path d="M13.75 3.75v4.5h4.5" />
      <path d="M8.25 12.25h7.5" />
      <path d="M8.25 15.75h5" />
    </IconBase>
  );
}

export function DownloadIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.75v9" />
      <path d="m8.75 10.75 3.25 3.25 3.25-3.25" />
      <path d="M5.25 18.75h13.5" />
    </IconBase>
  );
}

export function HideToolbarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2" />
      <path d="M3.25 9.25h17.5" />
      <path d="m8.75 15 3.25-3.25L15.25 15" />
    </IconBase>
  );
}

export function ShowToolbarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.25" y="5.25" width="17.5" height="13.5" rx="2" />
      <path d="M3.25 9.25h17.5" />
      <path d="m8.75 12.25 3.25 3.25 3.25-3.25" />
    </IconBase>
  );
}

export function SpinnerIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M20 12a8 8 0 1 1-3.05-6.3" />
    </IconBase>
  );
}

export function NewWindowIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M8.25 4.25h8.5a2 2 0 0 1 2 2v8.5" />
      <rect x="4.75" y="7.75" width="12.5" height="12" rx="2" />
      <path d="M11 10.75v6" />
      <path d="M8 13.75h6" />
    </IconBase>
  );
}

export function CloseIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="m7 7 10 10" />
      <path d="m17 7-10 10" />
    </IconBase>
  );
}

export function HistoryIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.75 12a7.25 7.25 0 1 0 2.12-5.13" />
      <path d="M4.75 5.75v3.75h3.75" />
      <path d="M12 8.5v3.75l2.75 1.65" />
    </IconBase>
  );
}

export function CollapseSidebarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2" />
      <path d="M9.25 5.25v13.5" />
      <path d="m15.25 9.5-2.5 2.5 2.5 2.5" />
    </IconBase>
  );
}

export function ExpandSidebarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <rect x="3.75" y="5.25" width="16.5" height="13.5" rx="2" />
      <path d="M9.25 5.25v13.5" />
      <path d="m12.75 9.5 2.5 2.5-2.5 2.5" />
    </IconBase>
  );
}

export function GitHubIcon(props: AppIconProps) {
  return (
    <IconBase strokeWidth={1.95} {...props}>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0c-2.4-1.6-3.5-1.3-3.5-1.3a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </IconBase>
  );
}
