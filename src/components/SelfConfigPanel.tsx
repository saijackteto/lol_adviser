import { championIconUrl } from '../ddragon/client';
import {
  RANK_LABELS,
  RANKS,
  ROLE_LABELS,
  ROLES,
  TEAM_LABELS,
  TEAMS,
  type ChampionSummary,
  type MatchInput,
  type Rank,
  type Role,
  type SummonerSpell,
  type Team,
} from '../domain/types';
import styles from './SelfConfigPanel.module.css';

interface SelfConfigPanelProps {
  input: MatchInput;
  version: string;
  summonerSpells: readonly SummonerSpell[];
  championsById: ReadonlyMap<string, ChampionSummary>;
  banMode: boolean;
  onChange: (patch: Partial<MatchInput>) => void;
  onStartBanPick: () => void;
  onRemoveBan: (championId: string) => void;
}

function SpellSelect({
  label,
  value,
  spells,
  testId,
  onChange,
}: {
  label: string;
  value: string | undefined;
  spells: readonly SummonerSpell[];
  testId: string;
  onChange: (spellId: string | undefined) => void;
}) {
  return (
    <select
      aria-label={label}
      data-testid={testId}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? undefined : event.target.value)}
    >
      <option value="">未選択</option>
      {spells.map((spell) => (
        <option key={spell.id} value={spell.id}>
          {spell.name}
        </option>
      ))}
    </select>
  );
}

export function SelfConfigPanel({
  input,
  version,
  summonerSpells,
  championsById,
  banMode,
  onChange,
  onStartBanPick,
  onRemoveBan,
}: SelfConfigPanelProps) {
  function setSpell(kind: 'selfSpells' | 'opponentSpells', index: 0 | 1, spellId: string | undefined) {
    const next: [string?, string?] = [...input[kind]];
    next[index] = spellId;
    onChange({ [kind]: next });
  }

  return (
    <section className={styles.panel} aria-label="自分の設定">
      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>自分のチーム</span>
          <select
            data-testid="self-team"
            value={input.selfTeam}
            onChange={(event) => onChange({ selfTeam: event.target.value as Team })}
          >
            {TEAMS.map((team) => (
              <option key={team} value={team}>
                {TEAM_LABELS[team]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>自分のロール</span>
          <select
            data-testid="self-role"
            value={input.selfRole}
            onChange={(event) => onChange({ selfRole: event.target.value as Role })}
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>ランク帯</span>
          <select
            data-testid="rank"
            value={input.rank ?? ''}
            onChange={(event) =>
              onChange({ rank: event.target.value === '' ? undefined : (event.target.value as Rank) })
            }
          >
            <option value="">未選択</option>
            {RANKS.map((rank) => (
              <option key={rank} value={rank}>
                {RANK_LABELS[rank]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <span className={styles.label}>自分のサモナースペル</span>
          <div className={styles.spellPair}>
            <SpellSelect
              label="自分のサモナースペル1"
              testId="self-spell-1"
              value={input.selfSpells[0]}
              spells={summonerSpells}
              onChange={(id) => setSpell('selfSpells', 0, id)}
            />
            <SpellSelect
              label="自分のサモナースペル2"
              testId="self-spell-2"
              value={input.selfSpells[1]}
              spells={summonerSpells}
              onChange={(id) => setSpell('selfSpells', 1, id)}
            />
          </div>
        </div>
        <div className={styles.field}>
          <span className={styles.label}>対面のサモナースペル</span>
          <div className={styles.spellPair}>
            <SpellSelect
              label="対面のサモナースペル1"
              testId="opponent-spell-1"
              value={input.opponentSpells[0]}
              spells={summonerSpells}
              onChange={(id) => setSpell('opponentSpells', 0, id)}
            />
            <SpellSelect
              label="対面のサモナースペル2"
              testId="opponent-spell-2"
              value={input.opponentSpells[1]}
              spells={summonerSpells}
              onChange={(id) => setSpell('opponentSpells', 1, id)}
            />
          </div>
        </div>
      </div>

      <details className={styles.banSection}>
        <summary className={styles.banSummary}>BAN(任意・最大 10)</summary>
        <div className={styles.banBody}>
          <button
            type="button"
            data-testid="ban-pick-button"
            className={banMode ? styles.banButtonActive : undefined}
            disabled={input.bans.length >= 10}
            onClick={onStartBanPick}
          >
            {banMode ? 'BAN 入力中(下のグリッドから選択)' : 'BAN を追加'}
          </button>
          <div className={styles.banList} data-testid="ban-list">
            {input.bans.length === 0 && <span className={styles.banEmpty}>BAN なし</span>}
            {input.bans.map((championId) => (
              <span key={championId} className={styles.banItem}>
                <img src={championIconUrl(version, championId)} alt="" loading="lazy" />
                <span>{championsById.get(championId)?.name ?? championId}</span>
                <button
                  type="button"
                  className={styles.banRemove}
                  aria-label={`BAN から ${championsById.get(championId)?.name ?? championId} を削除`}
                  onClick={() => onRemoveBan(championId)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
