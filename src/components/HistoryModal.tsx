import {
  ROLE_LABELS,
  TEAM_LABELS,
  opponentChampionId,
  selfChampionId,
  type ChampionSummary,
  type MatchInput,
} from '../domain/types';
import { Modal } from './Modal';
import styles from './HistoryModal.module.css';

interface HistoryModalProps {
  history: readonly MatchInput[];
  championsById: ReadonlyMap<string, ChampionSummary>;
  onRestore: (entry: MatchInput) => void;
  onClose: () => void;
}

export function HistoryModal({ history, championsById, onRestore, onClose }: HistoryModalProps) {
  function championName(championId: string | undefined): string {
    if (!championId) return '不明';
    return championsById.get(championId)?.name ?? championId;
  }

  return (
    <Modal title="入力履歴(直近 10 件)" onClose={onClose}>
      {history.length === 0 ? (
        <p className={styles.empty}>履歴はまだありません。プロンプトを生成すると保存されます。</p>
      ) : (
        <ul className={styles.list} data-testid="history-list">
          {history.map((entry, index) => (
            <li key={index}>
              <button type="button" className={styles.entry} onClick={() => onRestore(entry)}>
                <span className={styles.matchup}>
                  {championName(selfChampionId(entry))}({ROLE_LABELS[entry.selfRole]}) vs{' '}
                  {championName(opponentChampionId(entry))}
                </span>
                <span className={styles.meta}>{TEAM_LABELS[entry.selfTeam]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
