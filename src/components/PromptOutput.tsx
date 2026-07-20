import styles from './PromptOutput.module.css';

interface PromptOutputProps {
  prompt: string;
  onCopy: () => void;
}

export function PromptOutput({ prompt, onCopy }: PromptOutputProps) {
  return (
    <section className={styles.output} aria-label="生成されたプロンプト">
      <div className={styles.header}>
        <h2 className={styles.title}>生成されたプロンプト</h2>
        <button type="button" data-testid="copy-button" onClick={onCopy}>
          コピー
        </button>
      </div>
      <pre className={styles.text} data-testid="prompt-text">
        {prompt}
      </pre>
    </section>
  );
}
