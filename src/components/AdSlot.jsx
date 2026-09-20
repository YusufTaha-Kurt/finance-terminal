import { useEffect, useRef } from 'react';
import { ADSENSE_CLIENT_ID, loadAdsenseScript } from '../config/ads';

// Tek bir Google AdSense birimini render eder. Client ID veya slot
// ayarlanmadıysa (hesap henüz onaylanmadıysa) hiçbir şey göstermez, bu
// yüzden üretime her zaman güvenle bırakılabilir.
export default function AdSlot({ slot, format = 'auto', className = '', style }) {
  const pushedRef = useRef(false);

  useEffect(() => {
    if (!ADSENSE_CLIENT_ID || !slot || pushedRef.current) return;
    pushedRef.current = true;
    loadAdsenseScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Reklam engelleyici aktifse ya da script henüz yüklenmediyse sessizce geç.
    }
  }, [slot]);

  if (!ADSENSE_CLIENT_ID || !slot) return null;

  return (
    <div className={`text-center ${className}`}>
      <span className="block text-[9px] uppercase tracking-wider text-wallstreet-muted/60 mb-1">
        Reklam
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block', ...style }}
        data-ad-client={ADSENSE_CLIENT_ID}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}
