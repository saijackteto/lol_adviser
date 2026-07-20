import styles from './Header.module.css';

interface HeaderProps {
  patchVersion: string | null;
  stale: boolean;
  onOpenTemplate: () => void;
  onOpenHistory: () => void;
}

export function Header({ patchVersion, stale, onOpenTemplate, onOpenHistory }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.titleArea}>
        <h1 className={styles.title}>LoL Adviser</h1>
        <span className={styles.subtitle}>アドバイスプロンプト生成</span>
        {patchVersion && (
          <span className={styles.patch} data-testid="patch-version">
            パッチ {patchVersion}
            {stale && '(キャッシュ)'}
          </span>
        )}
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={onOpenHistory}>
          履歴
        </button>
        <button type="button" onClick={onOpenTemplate}>
          テンプレート編集
        </button>
      </div>
    </header>
  );
}
