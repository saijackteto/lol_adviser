import { useState } from 'react';
import { championIconUrl } from '../ddragon/client';
import {
  ROLE_LABELS,
  ROLES,
  TEAM_LABELS,
  TEAMS,
  enemyTeamOf,
  type ChampionSummary,
  type MatchInput,
  type Role,
  type Team,
} from '../domain/types';
import type { PickTarget } from '../pickTarget';
import styles from './PickBoard.module.css';

interface SlotRef {
  team: Team;
  role: Role;
}

interface PickBoardProps {
  input: MatchInput;
  version: string;
  championsById: ReadonlyMap<string, ChampionSummary>;
  target: PickTarget | null;
  onSelectSlot: (team: Team, role: Role) => void;
  onClearSlot: (team: Team, role: Role) => void;
  onSwapSlots: (source: SlotRef, dest: SlotRef) => void;
}

function slotKey(slot: SlotRef): string {
  return `${slot.team}-${slot.role}`;
}

const DRAG_DATA_TYPE = 'application/x-lol-adviser-slot';

export function PickBoard({
  input,
  version,
  championsById,
  target,
  onSelectSlot,
  onClearSlot,
  onSwapSlots,
}: PickBoardProps) {
  const opponentTeam = enemyTeamOf(input.selfTeam);
  const [draggingSlot, setDraggingSlot] = useState<string | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<string | null>(null);

  return (
    <div className={styles.board}>
      {TEAMS.map((team) => (
        <section key={team} className={styles.teamColumn}>
          <h2 className={team === 'BLUE' ? styles.blueHeading : styles.redHeading}>
            {TEAM_LABELS[team]}
          </h2>
          {ROLES.map((role) => {
            const championId = input.picks[team][role];
            const champion = championId ? championsById.get(championId) : undefined;
            const isTarget = target?.kind === 'slot' && target.team === team && target.role === role;
            const isSelf = team === input.selfTeam && role === input.selfRole;
            const isOpponent = team === opponentTeam && role === input.selfRole;
            const slot: SlotRef = { team, role };
            const key = slotKey(slot);
            const classNames = [
              styles.slot,
              isTarget ? styles.slotTarget : '',
              isSelf ? styles.slotSelf : '',
              isOpponent ? styles.slotOpponent : '',
              draggingSlot === key ? styles.slotDragging : '',
              dragOverSlot === key && draggingSlot !== null && draggingSlot !== key
                ? styles.slotDragOver
                : '',
            ]
              .filter(Boolean)
              .join(' ');
            return (
              <div key={role} className={classNames}>
                <button
                  type="button"
                  className={styles.slotButton}
                  data-testid={`slot-${team}-${role}`}
                  onClick={() => onSelectSlot(team, role)}
                  aria-label={`${TEAM_LABELS[team]} ${ROLE_LABELS[role]} のピック`}
                  draggable={Boolean(championId)}
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData(DRAG_DATA_TYPE, JSON.stringify(slot));
                    setDraggingSlot(key);
                  }}
                  onDragEnd={() => {
                    setDraggingSlot(null);
                    setDragOverSlot(null);
                  }}
                  onDragOver={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG_DATA_TYPE)) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverSlot(key);
                  }}
                  onDragLeave={() => {
                    setDragOverSlot((current) => (current === key ? null : current));
                  }}
                  onDrop={(e) => {
                    if (!e.dataTransfer.types.includes(DRAG_DATA_TYPE)) return;
                    e.preventDefault();
                    setDragOverSlot(null);
                    setDraggingSlot(null);
                    const raw = e.dataTransfer.getData(DRAG_DATA_TYPE);
                    if (!raw) return;
                    const source = JSON.parse(raw) as SlotRef;
                    if (source.team === slot.team && source.role === slot.role) return;
                    onSwapSlots(source, slot);
                  }}
                >
                  <span className={styles.roleLabel}>{ROLE_LABELS[role]}</span>
                  {championId ? (
                    <span className={styles.champion}>
                      <img
                        className={styles.icon}
                        src={championIconUrl(version, championId)}
                        alt=""
                        loading="lazy"
                      />
                      <span className={styles.championName}>
                        {champion?.name ?? championId}
                      </span>
                    </span>
                  ) : (
                    <span className={styles.empty}>未選択</span>
                  )}
                  {isSelf && <span className={styles.badgeSelf}>自分</span>}
                  {isOpponent && <span className={styles.badgeOpponent}>対面</span>}
                </button>
                {championId && (
                  <button
                    type="button"
                    className={styles.clear}
                    aria-label={`${TEAM_LABELS[team]} ${ROLE_LABELS[role]} をクリア`}
                    onClick={() => onClearSlot(team, role)}
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
}
