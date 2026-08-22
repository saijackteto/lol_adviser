import styles from './PromptOutput.module.css';

interface PromptOutputProps {
  prompt: string;
  onCopy: () => void;
  /** 自分 vs 対面の lolalytics ビルドページ URL(生成できなければ undefined) */
  lolalyticsUrl?: string;
}

export function PromptOutput({ prompt, onCopy, lolalyticsUrl }: PromptOutputProps) {
  return (
    <section className={styles.output} aria-label="生成されたプロンプト">
      <div className={styles.header}>
        <h2 className={styles.title}>生成されたプロンプト</h2>
        <button type="button" data-testid="copy-button" onClick={onCopy}>
          コピー
        </button>
      </div>
      {lolalyticsUrl && (
        <a
          className={styles.lolalyticsLink}
          href={lolalyticsUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="lolalytics-link"
        >
          lolalytics で対面のビルド・カウンター情報を見る ↗
        </a>
      )}
      <pre className={styles.text} data-testid="prompt-text">
        {prompt}
      </pre>
    </section>
  );
}
