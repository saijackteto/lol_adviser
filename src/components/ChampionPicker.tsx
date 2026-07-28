import { useEffect, useMemo, useRef, useState } from 'react';
import { championIconUrl } from '../ddragon/client';
import { searchChampions } from '../domain/search';
import type { ChampionSummary } from '../domain/types';
import styles from './ChampionPicker.module.css';

interface ChampionPickerProps {
  champions: readonly ChampionSummary[];
  version: string;
  /** ピック済み or BAN 済み(グレーアウト対象) */
  pickedIds: ReadonlySet<string>;
  /** 現在の入力先の表示名(例: 「ブルーサイド トップ」「BAN」)。null なら入力先なし */
  targetLabel: string | null;
  onPick: (championId: string) => void;
}

export function ChampionPicker({
  champions,
  version,
  pickedIds,
  targetLabel,
  onPick,
}: ChampionPickerProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => searchChampions(champions, query), [champions, query]);

  useEffect(() => {
    if (targetLabel) inputRef.current?.focus();
  }, [targetLabel]);

  function pick(championId: string) {
    onPick(championId);
    setQuery('');
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    const first = results.find((c) => !pickedIds.has(c.id));
    if (first && targetLabel) {
      event.preventDefault();
      pick(first.id);
    }
  }

  return (
    <section className={styles.picker} aria-label="チャンピオン選択">
      <div className={styles.searchRow}>
        <input
          ref={inputRef}
          type="search"
          className={styles.search}
          placeholder="チャンピオン検索(例: あーり / ahri)"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          aria-label="チャンピオン検索"
        />
        <span className={styles.targetLabel} data-testid="pick-target">
          {targetLabel ? `入力先: ${targetLabel}` : 'スロットを選択してください'}
        </span>
      </div>
      <div className={styles.grid} data-testid="champion-grid">
        {results.map((champion) => {
          const picked = pickedIds.has(champion.id);
          return (
            <button
              key={champion.id}
              type="button"
              className={styles.cell}
              data-testid={`champion-${champion.id}`}
              title={`${champion.name} (${champion.id})`}
              disabled={picked || !targetLabel}
              onClick={() => pick(champion.id)}
            >
              <img
                className={styles.icon}
                src={championIconUrl(version, champion.id)}
                alt=""
                loading="lazy"
              />
              <span className={styles.name}>{champion.name}</span>
            </button>
          );
        })}
        {results.length === 0 && <p className={styles.noResult}>該当するチャンピオンがいません</p>}
      </div>
    </section>
  );
}
