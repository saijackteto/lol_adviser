// Vitest 動作確認用のサンプルテスト(implementation-plan 1-3)。フェーズ 2 で実テストに置き換える。
import { describe, expect, it } from 'vitest';

describe('vitest 動作確認', () => {
  it('テストランナーが動作する', () => {
    expect(1 + 1).toBe(2);
  });
});
