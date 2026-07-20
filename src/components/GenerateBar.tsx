import styles from './GenerateBar.module.css';

interface GenerateBarProps {
  generating: boolean;
  onGenerate: () => void;
}

export function GenerateBar({ generating, onGenerate }: GenerateBarProps) {
  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.generate}
        data-testid="generate-button"
        disabled={generating}
        onClick={onGenerate}
      >
        {generating ? '生成中…' : '現時点の情報で生成'}
      </button>
      <span className={styles.hint}>全ピック未確定でも生成できます(未入力は「不明」扱い)</span>
    </div>
  );
}
