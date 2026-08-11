import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <a
        className={styles.link}
        href="https://x.com/s_jack_tet"
        target="_blank"
        rel="noopener noreferrer"
      >
        作成者への連絡先(X)
      </a>
    </footer>
  );
}
