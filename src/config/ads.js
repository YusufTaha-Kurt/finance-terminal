// Google AdSense yapılandırması.
//
// AdSense hesabı onaylanıp bir "ca-pub-..." yayıncı kimliği alınana kadar bu
// değer boş kalmalı — boşken AdSlot bileşeni hiçbir şey render etmez ve
// reklam scripti hiç yüklenmez. Hesap onaylandığında sadece bu dosyayı
// doldurmak yeterli, başka bir yeri değiştirmeye gerek yok.
export const ADSENSE_CLIENT_ID = '';

// Her yerleşim için AdSense panelinde oluşturulan reklam birimi (slot) ID'si.
export const AD_SLOTS = {
  watchlist: '',
  news: '',
  settings: '',
  helpGuide: '',
};

let scriptRequested = false;

export function loadAdsenseScript() {
  if (scriptRequested || !ADSENSE_CLIENT_ID || typeof document === 'undefined') return;
  scriptRequested = true;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}
