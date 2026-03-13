import { GitHubIcon } from './AppIcons';

const REPO_URL = 'https://github.com/kfcx/AnyPeek';
const PREVIEW_TYPES = ['文本', 'Word', 'Excel', 'PPT', '图片', '更多文件'] as const;

export function EmptyState() {
  return (
    <section className="empty-state">
      <div className="empty-state-card">
        <div className="empty-state-head">
          <strong>AnyPeek</strong>
          <a
            className="empty-state-github"
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            aria-label="前往 AnyPeek GitHub 仓库"
            title="GitHub"
          >
            <GitHubIcon className="empty-state-github-icon" />
          </a>
        </div>

        <p className="empty-state-copy">输入URL或拖放文件<br></br>打开任意内容</p>

        <div className="empty-state-tags" aria-label="支持的预览内容">
          {PREVIEW_TYPES.map((item) => (
            <span key={item} className="empty-state-chip">
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
