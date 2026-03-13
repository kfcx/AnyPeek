import type { SVGProps } from 'react';

export type AppIconProps = SVGProps<SVGSVGElement>;

function IconBase({ strokeWidth = 1.9, ...props }: AppIconProps) {
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
      {...props}
    />
  );
}

export function PreviewIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M3.75 12s3.35-4.75 8.25-4.75S20.25 12 20.25 12 16.9 16.75 12 16.75 3.75 12 3.75 12Z" />
      <circle cx="12" cy="12" r="2.45" />
    </IconBase>
  );
}

export function LocalFileIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M14.5 3.75H8A2.75 2.75 0 0 0 5.25 6.5v11A2.75 2.75 0 0 0 8 20.25h8a2.75 2.75 0 0 0 2.75-2.75V8.25Z" />
      <path d="M14.5 3.75V8.25h4.25" />
      <path d="M8.75 12.25h6.5" />
      <path d="M8.75 15.75h4.5" />
    </IconBase>
  );
}

export function DownloadIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.25v9.5" />
      <path d="m8.75 10.5 3.25 3.25 3.25-3.25" />
      <path d="M5.25 18.25h13.5" />
    </IconBase>
  );
}

export function HideToolbarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.75 5.75h14.5A1.5 1.5 0 0 1 20.75 7.25v9.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M3.25 9h17.5" />
      <path d="m8.5 14.75 3.5-3.5 3.5 3.5" />
    </IconBase>
  );
}

export function ShowToolbarIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M4.75 5.75h14.5A1.5 1.5 0 0 1 20.75 7.25v9.5a1.5 1.5 0 0 1-1.5 1.5H4.75a1.5 1.5 0 0 1-1.5-1.5v-9.5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M3.25 9h17.5" />
      <path d="m8.5 11.25 3.5 3.5 3.5-3.5" />
    </IconBase>
  );
}

export function SpinnerIcon(props: AppIconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 4.25a7.75 7.75 0 1 0 7.75 7.75" />
      <path d="M19.75 7.5v-3.25H16.5" />
    </IconBase>
  );
}

export function GitHubIcon(props: AppIconProps) {
  return (
    <IconBase strokeWidth={2} {...props}>
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0c-2.4-1.6-3.5-1.3-3.5-1.3a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    </IconBase>
  );
}
