// ピッカーの入力先(スロット or BAN)。UI コンポーネント間で共有する。
import type { Role, Team } from './domain/types';

export type PickTarget = { kind: 'slot'; team: Team; role: Role } | { kind: 'ban' };
