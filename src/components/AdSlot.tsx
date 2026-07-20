import { useEffect } from 'react';
import { AD_SLOTS, ADSENSE_CLIENT } from '../ads/adsConfig';
import styles from './AdSlot.module.css';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** AdSense スクリプトを一度だけ読み込む(client 未設定なら何もしない) */
export function useAdSenseScript(): void {
  useEffect(() => {
    if (!ADSENSE_CLIENT) return;
    const id = 'adsbygoogle-script';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, []);
}

interface AdSlotProps {
  variant: 'topBanner' | 'sideRail';
}

/**
 * 広告枠。ID 未設定時は null を返しレイアウトに影響しない。
 * 表示時は枠の高さを CSS で事前予約し、読み込みによるガタつき(CLS)を防ぐ。
 */
export function AdSlot({ variant }: AdSlotProps) {
  const slot = AD_SLOTS[variant];
  const enabled = ADSENSE_CLIENT !== '' && slot !== '';

  useEffect(() => {
    if (!enabled) return;
    try {
      (window.adsbygoogle = window.adsbygoogle ?? []).push({});
    } catch {
      // 広告ブロッカー等での失敗はアプリ動作に影響させない
    }
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      className={variant === 'topBanner' ? styles.topBanner : styles.sideRail}
      aria-hidden="true"
      data-testid={`ad-${variant}`}
    >
      <ins
        className="adsbygoogle"
        style={{ display: 'block', width: '100%', height: '100%' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={variant === 'topBanner' ? 'horizontal' : undefined}
        data-full-width-responsive={variant === 'topBanner' ? 'true' : undefined}
      />
    </div>
  );
}
