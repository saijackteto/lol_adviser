import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { AdSlot, useAdSenseScript } from './components/AdSlot';
import { ChampionPicker } from './components/ChampionPicker';
import { GenerateBar } from './components/GenerateBar';
import { Header } from './components/Header';
import { HistoryModal } from './components/HistoryModal';
import { PickBoard } from './components/PickBoard';
import { PromptOutput } from './components/PromptOutput';
import { SelfConfigPanel } from './components/SelfConfigPanel';
import { TemplateEditorModal } from './components/TemplateEditorModal';
import { fetchChampionDetail, loadStaticData, type StaticData } from './ddragon/client';
import { DEFAULT_TEMPLATE, buildPrompt } from './domain/prompt';
import {
  ROLE_LABELS,
  ROLES,
  TEAM_LABELS,
  TEAMS,
  createEmptyMatchInput,
  enemyJunglerId,
  opponentChampionId,
  selfChampionId,
  type MatchInput,
  type Role,
  type Team,
} from './domain/types';
import type { PickTarget } from './pickTarget';
import {
  addHistoryEntry,
  clearCustomTemplate,
  loadCustomTemplate,
  loadHistory,
  saveCustomTemplate,
} from './storage/localStorage';

/** 自動フォーカス移動用のスロット順(ブルー TOP→SUP → レッド TOP→SUP) */
const SLOT_ORDER: ReadonlyArray<{ team: Team; role: Role }> = TEAMS.flatMap((team) =>
  ROLES.map((role) => ({ team, role })),
);

function nextEmptySlot(input: MatchInput, after: { team: Team; role: Role }): PickTarget | null {
  const startIndex = SLOT_ORDER.findIndex(
    (slot) => slot.team === after.team && slot.role === after.role,
  );
  for (let offset = 1; offset <= SLOT_ORDER.length; offset++) {
    const slot = SLOT_ORDER[(startIndex + offset) % SLOT_ORDER.length];
    if (!input.picks[slot.team][slot.role]) {
      return { kind: 'slot', ...slot };
    }
  }
  return null;
}

export function App() {
  const [staticData, setStaticData] = useState<StaticData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [input, setInput] = useState<MatchInput>(createEmptyMatchInput);
  const [target, setTarget] = useState<PickTarget | null>({
    kind: 'slot',
    team: 'BLUE',
    role: 'TOP',
  });
  const [prompt, setPrompt] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [customTemplate, setCustomTemplate] = useState<string | null>(() => loadCustomTemplate());
  const [history, setHistory] = useState<MatchInput[]>(() => loadHistory());
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useAdSenseScript(); // adsConfig.ts 未設定時は何もしない

  useEffect(() => {
    let cancelled = false;
    loadStaticData()
      .then((data) => {
        if (!cancelled) setStaticData(data);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const championsById = useMemo(
    () => new Map((staticData?.champions ?? []).map((champion) => [champion.id, champion])),
    [staticData],
  );

  const pickedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const team of TEAMS) {
      for (const role of ROLES) {
        const id = input.picks[team][role];
        if (id) ids.add(id);
      }
    }
    for (const id of input.bans) ids.add(id);
    return ids;
  }, [input]);

  const targetLabel = useMemo(() => {
    if (!target) return null;
    if (target.kind === 'ban') return 'BAN';
    return `${TEAM_LABELS[target.team]} ${ROLE_LABELS[target.role]}`;
  }, [target]);

  function showToast(message: string) {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  function handlePickChampion(championId: string) {
    if (!target || pickedIds.has(championId)) return;
    if (target.kind === 'ban') {
      if (input.bans.length >= 10) return;
      setInput((prev) => ({ ...prev, bans: [...prev.bans, championId] }));
      return; // BAN は連続入力できるよう target を維持
    }
    const { team, role } = target;
    setInput((prev) => {
      const next: MatchInput = {
        ...prev,
        picks: { ...prev.picks, [team]: { ...prev.picks[team], [role]: championId } },
      };
      setTarget(nextEmptySlot(next, { team, role }));
      return next;
    });
  }

  function handleClearSlot(team: Team, role: Role) {
    setInput((prev) => {
      const side = { ...prev.picks[team] };
      delete side[role];
      return { ...prev, picks: { ...prev.picks, [team]: side } };
    });
    setTarget({ kind: 'slot', team, role });
  }

  async function handleGenerate() {
    if (!staticData || generating) return;
    setGenerating(true);
    try {
      const targetIds = [
        selfChampionId(input),
        opponentChampionId(input),
        enemyJunglerId(input),
      ].filter((id, index, arr): id is string => !!id && arr.indexOf(id) === index);

      // スキルデータは取得できた分だけ埋め込む(1体の失敗で全体を止めない)
      const details = await Promise.all(
        targetIds.map((id) => fetchChampionDetail(staticData.version, id).catch(() => null)),
      );
      const skillDetails = details.filter((detail) => detail !== null);
      if (skillDetails.length < targetIds.length) {
        showToast('一部のスキルデータを取得できませんでした');
      }

      const text = buildPrompt({
        patchVersion: staticData.version,
        input,
        template: customTemplate ?? undefined,
        championName: (id) => championsById.get(id)?.name,
        spellName: (id) => staticData.summonerSpells.find((spell) => spell.id === id)?.name,
        skillDetails,
      });
      setPrompt(text);
      setHistory(addHistoryEntry(input));
    } finally {
      setGenerating(false);
    }
  }

  async function handleCopy() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      showToast('コピーしました');
    } catch {
      showToast('コピーに失敗しました(手動で選択してコピーしてください)');
    }
  }

  function handleRestoreHistory(entry: MatchInput) {
    setInput(structuredClone(entry));
    setPrompt(null);
    setHistoryOpen(false);
    showToast('履歴を復元しました');
  }

  if (loadError) {
    return (
      <main className={styles.container}>
        <div className={styles.errorBox} role="alert">
          <h1>読み込みエラー</h1>
          <p>チャンピオンデータ(Data Dragon)を取得できませんでした。</p>
          <p className={styles.errorDetail}>{loadError}</p>
          <button type="button" onClick={() => location.reload()}>
            再読み込み
          </button>
        </div>
      </main>
    );
  }

  if (!staticData) {
    return (
      <main className={styles.container}>
        <p className={styles.loading} data-testid="loading">
          チャンピオンデータを読み込み中…
        </p>
      </main>
    );
  }

  return (
    <main className={styles.container}>
      <Header
        patchVersion={staticData.version}
        stale={staticData.stale}
        onOpenTemplate={() => setTemplateOpen(true)}
        onOpenHistory={() => setHistoryOpen(true)}
      />

      {staticData.stale && (
        <p className={styles.staleBanner} role="status">
          ネットワークに接続できないため、キャッシュ済みデータ(パッチ {staticData.version}
          )で動作しています。
        </p>
      )}

      <AdSlot variant="topBanner" />
      <AdSlot variant="sideRail" />

      <SelfConfigPanel
        input={input}
        version={staticData.version}
        summonerSpells={staticData.summonerSpells}
        championsById={championsById}
        banMode={target?.kind === 'ban'}
        onChange={(patch) => setInput((prev) => ({ ...prev, ...patch }))}
        onStartBanPick={() => setTarget({ kind: 'ban' })}
        onRemoveBan={(championId) =>
          setInput((prev) => ({ ...prev, bans: prev.bans.filter((id) => id !== championId) }))
        }
      />

      <PickBoard
        input={input}
        version={staticData.version}
        championsById={championsById}
        target={target}
        onSelectSlot={(team, role) => setTarget({ kind: 'slot', team, role })}
        onClearSlot={handleClearSlot}
      />

      <ChampionPicker
        champions={staticData.champions}
        version={staticData.version}
        pickedIds={pickedIds}
        targetLabel={targetLabel}
        onPick={handlePickChampion}
      />

      <GenerateBar generating={generating} onGenerate={handleGenerate} />

      {prompt && <PromptOutput prompt={prompt} onCopy={handleCopy} />}

      {templateOpen && (
        <TemplateEditorModal
          current={customTemplate ?? DEFAULT_TEMPLATE}
          isCustom={customTemplate !== null}
          onSave={(template) => {
            if (template.trim() === '' || template === DEFAULT_TEMPLATE) {
              clearCustomTemplate();
              setCustomTemplate(null);
            } else {
              saveCustomTemplate(template);
              setCustomTemplate(template);
            }
            setTemplateOpen(false);
            showToast('テンプレートを保存しました');
          }}
          onReset={() => {
            clearCustomTemplate();
            setCustomTemplate(null);
          }}
          onClose={() => setTemplateOpen(false)}
        />
      )}

      {historyOpen && (
        <HistoryModal
          history={history}
          championsById={championsById}
          onRestore={handleRestoreHistory}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {toast && (
        <div className={styles.toast} role="status" data-testid="toast">
          {toast}
        </div>
      )}
    </main>
  );
}
