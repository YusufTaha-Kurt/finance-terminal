import { useState } from 'react';
import { X, HelpCircle, ChevronDown, Shield } from 'lucide-react';
import AdSlot from './AdSlot';
import { AD_SLOTS } from '../config/ads';

// ============================================================================
//  Konu Kategorileri
// ============================================================================
const TOPICS = [
  { id: 'overview', label: 'Genel Bakış', emoji: '🏠' },
  { id: 'ema', label: 'EMA (Hareketli Ortalama)', emoji: '📈' },
  { id: 'rsi', label: 'RSI', emoji: '⚡' },
  { id: 'macd', label: 'MACD', emoji: '📊' },
  { id: 'bollinger', label: 'Bollinger Bantları', emoji: '🌊' },
  { id: 'stochastic', label: 'Stochastic', emoji: '🔄' },
  { id: 'atr', label: 'ATR', emoji: '📐' },
  { id: 'adx', label: 'ADX', emoji: '💪' },
  { id: 'ichimoku', label: 'Ichimoku Cloud', emoji: '☁️' },
  { id: 'supertrend', label: 'Supertrend', emoji: '🚀' },
  { id: 'vwap', label: 'VWAP', emoji: '📦' },
  { id: 'obv', label: 'OBV', emoji: '🔋' },
  { id: 'cci', label: 'CCI', emoji: '🎯' },
  { id: 'williamsR', label: 'Williams %R', emoji: '🔻' },
  { id: 'mfi', label: 'MFI', emoji: '💰' },
  { id: 'roc', label: 'ROC', emoji: '🏎️' },
  { id: 'psar', label: 'Parabolic SAR', emoji: '🪂' },
  { id: 'keltner', label: 'Keltner Kanalları', emoji: '📏' },
  { id: 'pivot', label: 'Pivot Noktaları', emoji: '📌' },
  { id: 'signals', label: 'AL/SAT Sinyalleri', emoji: '🚦' },
  { id: 'security', label: 'Güvenlik & API', emoji: '🔒' },
];

// ============================================================================
//  Eğitim İçerikleri
// ============================================================================
const CONTENT = {
  overview: () => (
    <div className="space-y-5">
      <Section title="Finance Terminal Nedir?">
        <p>Bu terminal, finansal varlıkların teknik analizini yapmanıza yardımcı olan profesyonel bir araçtır. BIST, ABD borsası, kripto para, emtia, tahvil, döviz ve VİOP piyasalarını tek bir ekrandan takip edebilirsiniz.</p>
      </Section>
      <Section title="Teknik Analiz Nedir?">
        <p>Teknik analiz, geçmiş fiyat ve hacim verilerini kullanarak gelecekteki fiyat hareketlerini tahmin etmeye çalışan bir yöntemdir. Grafikler ve indikatörler (göstergeler) kullanır.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong className="text-white">Trend İndikatörleri:</strong> Fiyatın genel yönünü belirler (EMA, ADX, Ichimoku, Supertrend)</li>
          <li><strong className="text-white">Momentum İndikatörleri:</strong> Fiyat hareketinin gücünü ölçer (RSI, MACD, Stochastic, CCI)</li>
          <li><strong className="text-white">Volatilite İndikatörleri:</strong> Fiyat dalgalanmasını ölçer (Bollinger, ATR, Keltner)</li>
          <li><strong className="text-white">Hacim İndikatörleri:</strong> İşlem hacmini analiz eder (OBV, VWAP, MFI)</li>
        </ul>
      </Section>
      <Section title="Nasıl Başlanır?">
        <ol className="list-decimal pl-5 space-y-2 mt-2">
          <li>Sol paneldeki <strong className="text-white">piyasa sekmelerinden</strong> istediğiniz piyasayı seçin</li>
          <li>İzleme listesinden bir sembol seçin veya yeni ekleyin</li>
          <li>Sağ üstteki <strong className="text-white">İndikatörler</strong> butonundan göstergeleri açın/kapatın</li>
          <li>Sol kenar çubuğundan <strong className="text-white">çizim araçlarını</strong> kullanarak destek/direnç çizin</li>
          <li>Sağ alttaki <strong className="text-wallstreet-green">✨ AI butonuyla</strong> yapay zeka analizi yapın</li>
        </ol>
      </Section>
      <Tip text="Soldan bir konu seçerek her indikatörün detaylı açıklamasını okuyabilirsiniz." />
    </div>
  ),

  ema: () => (
    <div className="space-y-5">
      <Section title="EMA (Üssel Hareketli Ortalama) Nedir?">
        <p>EMA, fiyatların belirli bir periyottaki ortalamasını alır, ancak <strong className="text-white">son fiyatlara daha fazla ağırlık</strong> verir. Bu sayede basit hareketli ortalamaya (SMA) göre fiyat değişimlerine daha hızlı tepki verir.</p>
      </Section>
      <Section title="Terminaldeki EMA'lar">
        <div className="space-y-3 mt-2">
          <ColorLine color="#f7d731" label="EMA 9 (Sarı)" desc="Kısa vadeli trend. 'Hız göstergesi' gibi düşünün — fiyatın anlık momentumunu yansıtır." />
          <ColorLine color="#ff9800" label="EMA 21 (Turuncu)" desc="Orta vadeli trend. EMA 9 ile birlikte kısa vadeli yön değişimlerini yakalar." />
          <ColorLine color="#2196f3" label="EMA 50 (Mavi)" desc="Uzun vadeli trend. 'Güvenlik halatı' gibi düşünün — fiyat üstündeyse boğa, altındaysa ayı piyasası." />
        </div>
      </Section>
      <Section title="Nasıl Okunur?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Yükseliş Sinyali:</strong> EMA 9 {`>`} EMA 21 {`>`} EMA 50 — Üç çizgi sırayla dizilmiş, fiyat en üstte</li>
          <li><strong className="text-wallstreet-red">Düşüş Sinyali:</strong> EMA 9 {`<`} EMA 21 {`<`} EMA 50 — Ters sıralama, fiyat en altta</li>
          <li><strong className="text-white">Golden Cross:</strong> EMA 9, EMA 50'yi yukarı kesiyor → Güçlü AL sinyali</li>
          <li><strong className="text-white">Death Cross:</strong> EMA 9, EMA 50'yi aşağı kesiyor → Güçlü SAT sinyali</li>
        </ul>
      </Section>
      <Warning text="EMA tek başına karar vermek için yeterli değildir. RSI ve MACD ile birlikte kullanmak daha güvenilir sonuçlar verir." />
    </div>
  ),

  rsi: () => (
    <div className="space-y-5">
      <Section title="RSI (Göreceli Güç Endeksi) Nedir?">
        <p>RSI, fiyatın <strong className="text-white">aşırı alım veya aşırı satım</strong> bölgesinde olup olmadığını 0-100 arasında bir değerle ölçer. J. Welles Wilder tarafından geliştirilmiştir. Varsayılan periyod 14'tür.</p>
      </Section>
      <Section title="Kritik Seviyeler">
        <div className="space-y-3 mt-2">
          <LevelBar level={70} color="#ef5350" label="Aşırı Alım Bölgesi (70+)" desc="Fiyat aşırı şişmiş. Satış baskısı gelebilir. 'Balon' riski." />
          <LevelBar level={50} color="#787b86" label="Nötr Bölge (40-60)" desc="Trend belirsiz. Yön için başka indikatörlere bakın." />
          <LevelBar level={30} color="#26a69a" label="Aşırı Satım Bölgesi (30-)" desc="Fiyat aşırı ezilmiş. Tepki yükselişi ihtimali yüksek." />
        </div>
      </Section>
      <Section title="RSI Divergence (Uyumsuzluk)">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Pozitif Divergence:</strong> Fiyat düşüyor ama RSI yükseliyor → Trend dönüşü (AL fırsatı)</li>
          <li><strong className="text-wallstreet-red">Negatif Divergence:</strong> Fiyat yükseliyor ama RSI düşüyor → Zayıflama (SAT uyarısı)</li>
        </ul>
      </Section>
      <Tip text="RSI 50 seviyesi de önemlidir. 50'nin üzerinde kalmak, genel trendin yukarı olduğunu gösterir." />
    </div>
  ),

  macd: () => (
    <div className="space-y-5">
      <Section title="MACD Nedir?">
        <p>MACD (Moving Average Convergence/Divergence), iki EMA arasındaki farkı ve bu farkın kendi ortalamasını gösterir. <strong className="text-white">Hem trend hem de momentum</strong> hakkında bilgi verir.</p>
      </Section>
      <Section title="Bileşenleri">
        <div className="space-y-3 mt-2">
          <ColorLine color="#2196f3" label="MACD Çizgisi (Mavi)" desc="EMA 12 ile EMA 26 arasındaki fark. Pozitifse kısa vadeli EMA uzun vadeli EMA'nın üstünde." />
          <ColorLine color="#ff9800" label="Sinyal Çizgisi (Turuncu)" desc="MACD çizgisinin 9 periyotluk EMA'sı. MACD'nin 'yumuşatılmış' hali." />
          <ColorLine color="#26a69a" label="Histogram (Çubuklar)" desc="MACD ile Sinyal arasındaki fark. Çubuklar büyüyorsa momentum artıyor." />
        </div>
      </Section>
      <Section title="Sinyaller">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">AL:</strong> MACD çizgisi, sinyal çizgisini <strong>yukarı</strong> kestiğinde (histogram negatiften pozitife geçer)</li>
          <li><strong className="text-wallstreet-red">SAT:</strong> MACD çizgisi, sinyal çizgisini <strong>aşağı</strong> kestiğinde (histogram pozitiften negatife geçer)</li>
          <li><strong className="text-white">Sıfır Çizgisi:</strong> MACD'nin 0'ın üstünde olması genel trendin yukarı olduğunu gösterir</li>
        </ul>
      </Section>
      <Warning text="Yatay piyasalarda MACD çok sayıda yanlış sinyal üretebilir. ADX ile trend gücünü teyit edin." />
    </div>
  ),

  bollinger: () => (
    <div className="space-y-5">
      <Section title="Bollinger Bantları Nedir?">
        <p>John Bollinger tarafından geliştirilen bu indikatör, fiyatın <strong className="text-white">volatilitesini (dalgalanmasını)</strong> ölçer. 20 periyotluk SMA'nın ±2 standart sapması olarak hesaplanır.</p>
      </Section>
      <Section title="Bileşenleri">
        <div className="space-y-3 mt-2">
          <ColorLine color="#9c27b0" label="Üst Bant" desc="SMA + 2 × Standart Sapma. Fiyat buraya yaklaştıysa 'pahalı' bölge." />
          <ColorLine color="#9c27b0" label="Orta Bant (SMA 20)" desc="20 günlük basit ortalama. Dinamik destek/direnç görevi görür." />
          <ColorLine color="#9c27b066" label="Alt Bant" desc="SMA - 2 × Standart Sapma. Fiyat buraya yaklaştıysa 'ucuz' bölge." />
        </div>
      </Section>
      <Section title="Stratejiler">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">Sıkışma (Squeeze):</strong> Bantlar daraldığında büyük bir hareket beklenir. Yön belli değildir!</li>
          <li><strong className="text-white">Bant Yürüyüşü:</strong> Güçlü trendlerde fiyat üst/alt bant boyunca 'yürür'. Bu zayıflık DEĞİL, güç işareti.</li>
          <li><strong className="text-wallstreet-green">Alt Bant Dokunuşu:</strong> RSI 30 altında + alt banda dokunuş = Potansiyel alım fırsatı</li>
          <li><strong className="text-wallstreet-red">Üst Bant Dokunuşu:</strong> RSI 70 üstü + üst banda dokunuş = Potansiyel satış fırsatı</li>
        </ul>
      </Section>
      <Tip text="Bant genişliği %4'ün altına düştüğünde 'squeeze' durumu oluşur. Patlama (breakout) yakındır!" />
    </div>
  ),

  stochastic: () => (
    <div className="space-y-5">
      <Section title="Stochastic Osilatör Nedir?">
        <p>Stochastic, fiyatın <strong className="text-white">belirli bir dönemdeki en yüksek ve en düşük değere göre nerede kapandığını</strong> gösterir. 0-100 arasında salınır. George Lane tarafından geliştirilmiştir.</p>
      </Section>
      <Section title="Bileşenleri">
        <div className="space-y-3 mt-2">
          <ColorLine color="#00bcd4" label="%K Çizgisi (Hızlı)" desc="Anlık stochastic değeri. (Kapanış - En düşük) / (En yüksek - En düşük) × 100" />
          <ColorLine color="#ff9800" label="%D Çizgisi (Yavaş)" desc="%K'nın 3 periyotluk SMA'sı. Sinyal çizgisi olarak kullanılır." />
        </div>
      </Section>
      <Section title="Sinyaller">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">AL:</strong> %K, %D'yi 20 altında yukarı kesiyor (aşırı satım çıkışı)</li>
          <li><strong className="text-wallstreet-red">SAT:</strong> %K, %D'yi 80 üzerinde aşağı kesiyor (aşırı alım çıkışı)</li>
          <li><strong className="text-white">80 üzeri:</strong> Aşırı alım bölgesi (ama güçlü trendde uzun süre kalabilir)</li>
          <li><strong className="text-white">20 altı:</strong> Aşırı satım bölgesi (dipten dönüş potansiyeli)</li>
        </ul>
      </Section>
      <Warning text="Güçlü trendlerde Stochastic uzun süre aşırı alım/satım bölgesinde kalır. Yatay piyasalarda daha güvenilirdir." />
    </div>
  ),

  atr: () => (
    <div className="space-y-5">
      <Section title="ATR (Ortalama Gerçek Aralık) Nedir?">
        <p>ATR, fiyatın <strong className="text-white">ne kadar hareket ettiğini</strong> (volatilite) ölçer. Yön göstermez, sadece hareketin büyüklüğünü söyler. Varsayılan periyod 14'tür.</p>
      </Section>
      <Section title="Nasıl Hesaplanır?">
        <p className="mt-2">True Range = En büyüğü:</p>
        <ul className="list-disc pl-5 space-y-1 mt-1">
          <li>Günün yüksek - düşük farkı</li>
          <li>|Günün yüksek - Dünkü kapanış|</li>
          <li>|Günün düşük - Dünkü kapanış|</li>
        </ul>
        <p className="mt-2">ATR = True Range'in 14 günlük ortalaması</p>
      </Section>
      <Section title="Kullanım Alanları">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">Stop-Loss Belirleme:</strong> ATR × 2 mesafesine stop koyun. Örn: Fiyat 100₺, ATR 5₺ → Stop: 90₺</li>
          <li><strong className="text-white">Volatilite Karşılaştırma:</strong> ATR yüksekse piyasa hareketli, düşükse sakin</li>
          <li><strong className="text-white">Pozisyon Büyüklüğü:</strong> ATR yüksekse daha küçük pozisyon açın (risk yönetimi)</li>
          <li><strong className="text-white">Breakout Teyidi:</strong> Sıkışmadan sonra ATR artıyorsa breakout gerçek</li>
        </ul>
      </Section>
      <Tip text="ATR yön göstermez! Sadece 'ne kadar hareket var' sorusunu yanıtlar. Yön için EMA veya MACD kullanın." />
    </div>
  ),

  adx: () => (
    <div className="space-y-5">
      <Section title="ADX (Ortalama Yön Endeksi) Nedir?">
        <p>ADX, <strong className="text-white">trendin gücünü</strong> ölçer (yönünü değil). 0-100 arasında bir değer verir. Wilder tarafından geliştirilmiştir.</p>
      </Section>
      <Section title="Bileşenleri">
        <div className="space-y-3 mt-2">
          <ColorLine color="#9c27b0" label="ADX Çizgisi (Mor)" desc="Trend gücü. 25 üzeri = trend var, 20 altı = trend yok (yatay piyasa)." />
          <ColorLine color="#26a69a" label="+DI (Yeşil)" desc="Yükseliş yönlü hareketin gücü." />
          <ColorLine color="#ef5350" label="-DI (Kırmızı)" desc="Düşüş yönlü hareketin gücü." />
        </div>
      </Section>
      <Section title="Okuma Kuralları">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">ADX {`>`} 25:</strong> Güçlü trend var — Trend takip stratejileri kullanın</li>
          <li><strong className="text-white">ADX {`<`} 20:</strong> Trend yok — Osilatör stratejileri (RSI, Stochastic) kullanın</li>
          <li><strong className="text-wallstreet-green">+DI {`>`} -DI + ADX yükseliyor:</strong> Güçlü yükseliş trendi</li>
          <li><strong className="text-wallstreet-red">-DI {`>`} +DI + ADX yükseliyor:</strong> Güçlü düşüş trendi</li>
          <li><strong className="text-white">ADX düşüyor:</strong> Trend zayıflıyor (dikkatli olun)</li>
        </ul>
      </Section>
      <Tip text="ADX en güçlü filtredir. ADX < 20 iken MACD/EMA sinyalleri genellikle yanlıştır. Önce ADX'e bakın!" />
    </div>
  ),

  ichimoku: () => (
    <div className="space-y-5">
      <Section title="Ichimoku Cloud Nedir?">
        <p>Japon gazeteci Goichi Hosoda tarafından geliştirilen <strong className="text-white">hepsi bir arada</strong> indikatörüdür. Trend, momentum, destek/direnç ve sinyal üretimi tek bir sistemde birleşir.</p>
      </Section>
      <Section title="5 Bileşen">
        <div className="space-y-3 mt-2">
          <ColorLine color="#2196f3" label="Tenkan-sen (Dönüş Çizgisi, 9)" desc="Son 9 periyodun (en yüksek + en düşük) / 2. Kısa vadeli trend." />
          <ColorLine color="#ef5350" label="Kijun-sen (Temel Çizgi, 26)" desc="Son 26 periyodun ortası. Orta vadeli trend ve destek/direnç." />
          <ColorLine color="#26a69a66" label="Senkou Span A (Bulut Üstü)" desc="(Tenkan + Kijun) / 2, 26 periyod ileri kaydırılmış." />
          <ColorLine color="#ef535066" label="Senkou Span B (Bulut Altı)" desc="Son 52 periyodun ortası, 26 periyod ileri kaydırılmış." />
          <ColorLine color="#787b86" label="Chikou Span (Gecikme)" desc="Kapanış fiyatı, 26 periyod geriye kaydırılmış." />
        </div>
      </Section>
      <Section title="Okuma Kuralları">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Fiyat bulutun üstünde:</strong> Yükseliş trendi</li>
          <li><strong className="text-wallstreet-red">Fiyat bulutun altında:</strong> Düşüş trendi</li>
          <li><strong className="text-white">Fiyat bulutun içinde:</strong> Kararsızlık bölgesi (işlem yapma)</li>
          <li><strong className="text-white">Yeşil bulut (A {`>`} B):</strong> Boğa piyasası</li>
          <li><strong className="text-white">Kırmızı bulut (B {`>`} A):</strong> Ayı piyasası</li>
          <li><strong className="text-wallstreet-green">Tenkan {`>`} Kijun kesişimi:</strong> AL sinyali</li>
        </ul>
      </Section>
    </div>
  ),

  supertrend: () => (
    <div className="space-y-5">
      <Section title="Supertrend Nedir?">
        <p>Supertrend, ATR tabanlı bir <strong className="text-white">trend takip indikatörüdür</strong>. Fiyatın üstünde veya altında tek bir çizgi çizer. Basitliği ve etkinliği ile popülerdir.</p>
      </Section>
      <Section title="Nasıl Çalışır?">
        <p className="mt-2">Formül: Orta Fiyat ± (Çarpan × ATR)</p>
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Yeşil Çizgi (Fiyatın altında):</strong> Yükseliş trendi — Long pozisyon aç</li>
          <li><strong className="text-wallstreet-red">Kırmızı Çizgi (Fiyatın üstünde):</strong> Düşüş trendi — Short veya kenarda kal</li>
          <li><strong className="text-white">Renk değişimi:</strong> Trend dönüşü — Pozisyon değiştir</li>
        </ul>
      </Section>
      <Section title="Avantajları">
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>Açık ve net sinyaller verir (yeşil = al, kırmızı = sat)</li>
          <li>Trailing stop-loss olarak kullanılabilir</li>
          <li>ATR tabanlı olduğu için volatiliteye uyum sağlar</li>
        </ul>
      </Section>
      <Warning text="Yatay piyasalarda çok sayıda yanlış sinyal üretir. ADX > 25 iken daha güvenilirdir." />
    </div>
  ),

  vwap: () => (
    <div className="space-y-5">
      <Section title="VWAP (Hacim Ağırlıklı Ortalama Fiyat) Nedir?">
        <p>VWAP, <strong className="text-white">hacim ağırlıklı ortalama fiyatı</strong> gösterir. Kurumsal yatırımcıların en çok kullandığı indikatördür. Gün içi ticarette 'adil fiyat' referansıdır.</p>
      </Section>
      <Section title="Nasıl Okunur?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Fiyat {`>`} VWAP:</strong> Alıcılar kontrolde — Boğa eğilimi</li>
          <li><strong className="text-wallstreet-red">Fiyat {`<`} VWAP:</strong> Satıcılar kontrolde — Ayı eğilimi</li>
          <li><strong className="text-white">VWAP'a dokunuş:</strong> Dinamik destek/direnç noktası. Tepki beklenir.</li>
        </ul>
      </Section>
      <Section title="Kurumsal Kullanım">
        <p className="mt-2">Kurumsal fonlar, büyük alım yaparken fiyatı VWAP'ın altında tutmaya çalışır. VWAP'ın üstünde alım yapmak 'kötü doluluk' sayılır. Bu nedenle VWAP, güçlü bir psikolojik destek/direnç hattıdır.</p>
      </Section>
      <Tip text="VWAP en çok gün içi (intraday) analizde kullanılır. Günlük grafiklerde anlamını kaybedebilir." />
    </div>
  ),

  obv: () => (
    <div className="space-y-5">
      <Section title="OBV (On-Balance Volume) Nedir?">
        <p>OBV, <strong className="text-white">hacim akışını kümülatif olarak</strong> izler. Fiyat yükseldiği günlerde hacmi ekler, düştüğü günlerde çıkarır. Joe Granville tarafından geliştirilmiştir.</p>
      </Section>
      <Section title="Nasıl Okunur?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">OBV yükseliyor + Fiyat yükseliyor:</strong> Trend teyit edildi — Güçlü yükseliş</li>
          <li><strong className="text-wallstreet-red">OBV düşüyor + Fiyat düşüyor:</strong> Düşüş trendi teyit</li>
          <li><strong className="text-white">OBV yükseliyor + Fiyat yatay:</strong> Gizli birikim! Yakında fiyat patlayabilir</li>
          <li><strong className="text-white">OBV düşüyor + Fiyat yatay:</strong> Gizli dağıtım! Düşüş yakın olabilir</li>
        </ul>
      </Section>
      <Tip text="OBV'nin mutlak değeri önemli değil, yönü önemli. OBV trendiyle fiyat trendini karşılaştırın." />
    </div>
  ),

  cci: () => (
    <div className="space-y-5">
      <Section title="CCI (Emtia Kanal Endeksi) Nedir?">
        <p>CCI, fiyatın <strong className="text-white">istatistiksel ortalamasından ne kadar uzaklaştığını</strong> ölçer. İsmi emtia olsa da tüm piyasalarda kullanılır. Donald Lambert tarafından geliştirilmiştir.</p>
      </Section>
      <Section title="Kritik Seviyeler">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-red">+100 üzeri:</strong> Aşırı alım — Satış baskısı gelebilir</li>
          <li><strong className="text-white">0 çizgisi:</strong> Nötr — Ortalamanın tam üstünde</li>
          <li><strong className="text-wallstreet-green">-100 altı:</strong> Aşırı satım — Alım fırsatı olabilir</li>
        </ul>
      </Section>
      <Section title="Strateji">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>CCI -100'ün altından yukarı geçtiğinde → <strong className="text-wallstreet-green">AL</strong></li>
          <li>CCI +100'ün üstünden aşağı geçtiğinde → <strong className="text-wallstreet-red">SAT</strong></li>
          <li>0 çizgisi geçişleri trend yönü değişimini teyit eder</li>
        </ul>
      </Section>
    </div>
  ),

  williamsR: () => (
    <div className="space-y-5">
      <Section title="Williams %R Nedir?">
        <p>Larry Williams tarafından geliştirilen bu osilatör, Stochastic'e çok benzer ama <strong className="text-white">ters ölçeklenmiştir</strong> (0 ile -100 arası). Aşırı alım/satım bölgelerini tespit eder.</p>
      </Section>
      <Section title="Kritik Seviyeler">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-red">-20 üzeri (0'a yakın):</strong> Aşırı alım — Fiyat zirvede olabilir</li>
          <li><strong className="text-wallstreet-green">-80 altı (-100'e yakın):</strong> Aşırı satım — Fiyat dipte olabilir</li>
        </ul>
      </Section>
      <Section title="Stochastic'ten Farkı">
        <p className="mt-2">Temelde aynı mantık, ama Williams %R negatif ölçekte çalışır ve daha hızlı tepki verir (smoothing uygulanmaz). Scalping ve kısa vadeli ticarette tercih edilir.</p>
      </Section>
    </div>
  ),

  mfi: () => (
    <div className="space-y-5">
      <Section title="MFI (Para Akış Endeksi) Nedir?">
        <p>MFI, <strong className="text-white">hacim ağırlıklı RSI</strong> olarak düşünülebilir. Hem fiyat hem de hacim verilerini kullanarak para akışının yönünü belirler.</p>
      </Section>
      <Section title="RSI'dan Farkı">
        <p className="mt-2">RSI sadece fiyatı dikkate alırken, MFI hacmi de hesaba katar. Bu sayede 'akıllı para'nın hareketlerini daha iyi yakalar.</p>
      </Section>
      <Section title="Sinyaller">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-red">80 üzeri:</strong> Aşırı alım — Para çıkışı başlayabilir</li>
          <li><strong className="text-wallstreet-green">20 altı:</strong> Aşırı satım — Para girişi başlayabilir</li>
          <li><strong className="text-white">Divergence:</strong> Fiyat yeni zirve yapıyor ama MFI yapmıyorsa → Zayıflama sinyali</li>
        </ul>
      </Section>
      <Tip text="MFI, özellikle hisse senetlerinde RSI'dan daha güvenilirdir çünkü hacim bilgisini de içerir." />
    </div>
  ),

  roc: () => (
    <div className="space-y-5">
      <Section title="ROC (Değişim Oranı) Nedir?">
        <p>ROC, fiyatın <strong className="text-white">belirli bir süre önceki fiyata göre yüzde değişimini</strong> ölçer. Momentum gücünü ve trend hızını gösterir.</p>
      </Section>
      <Section title="Formül">
        <p className="mt-2 font-mono text-wallstreet-green">ROC = ((Bugünkü Kapanış - 12 Gün Önceki Kapanış) / 12 Gün Önceki Kapanış) × 100</p>
      </Section>
      <Section title="Nasıl Okunur?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">ROC {`>`} 0:</strong> Fiyat 12 gün öncesine göre yukarıda — Yükseliş momentumu</li>
          <li><strong className="text-wallstreet-red">ROC {`<`} 0:</strong> Fiyat 12 gün öncesine göre aşağıda — Düşüş momentumu</li>
          <li><strong className="text-white">0 çizgisi geçişi:</strong> Momentum yön değiştiriyor</li>
          <li><strong className="text-white">Aşırı yüksek/düşük:</strong> Momentumun tersine dönme ihtimali artar</li>
        </ul>
      </Section>
    </div>
  ),

  psar: () => (
    <div className="space-y-5">
      <Section title="Parabolic SAR Nedir?">
        <p>Wilder tarafından geliştirilen bu indikatör, fiyatın üstüne veya altına <strong className="text-white">noktalar koyarak</strong> trend yönünü ve potansiyel dönüş noktalarını gösterir. SAR = 'Stop and Reverse' (Dur ve Tersine Çevir).</p>
      </Section>
      <Section title="Nasıl Okunur?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-wallstreet-green">Noktalar fiyatın altında:</strong> Yükseliş trendi — Long pozisyon</li>
          <li><strong className="text-wallstreet-red">Noktalar fiyatın üstünde:</strong> Düşüş trendi — Short veya kenarda kal</li>
          <li><strong className="text-white">Nokta yer değiştirdiğinde:</strong> Trend dönüşü — Pozisyon çevir</li>
        </ul>
      </Section>
      <Section title="Trailing Stop Olarak">
        <p className="mt-2">PSAR noktaları doğal bir trailing stop-loss seviyesidir. Fiyat PSAR noktasının altına düştüğünde pozisyonunuzu kapatın.</p>
      </Section>
      <Warning text="Yatay piyasalarda çok fazla yanlış sinyal üretir. ADX > 25 ile filtreleyin." />
    </div>
  ),

  keltner: () => (
    <div className="space-y-5">
      <Section title="Keltner Kanalları Nedir?">
        <p>Bollinger bantlarına benzer, ama standart sapma yerine <strong className="text-white">ATR kullanır</strong>. Bu sayede daha düzgün ve az salınan bantlar oluşturur.</p>
      </Section>
      <Section title="Bollinger vs Keltner">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">Bollinger:</strong> SMA ± Standart Sapma → Ani fiyat değişimlerine çok duyarlı</li>
          <li><strong className="text-white">Keltner:</strong> EMA ± ATR → Daha yumuşak, daha az yanlış sinyal</li>
          <li><strong className="text-white">İkisi birlikte:</strong> Bollinger bantları Keltner kanallarının içine girdiğinde → 'Squeeze' = Büyük hareket geliyor!</li>
        </ul>
      </Section>
      <Section title="Kullanım">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>Fiyat üst kanalın dışına çıktığında → Güçlü yükseliş sinyali</li>
          <li>Fiyat alt kanalın dışına çıktığında → Güçlü düşüş sinyali</li>
          <li>Orta çizgi (EMA) dinamik destek/direnç olarak çalışır</li>
        </ul>
      </Section>
    </div>
  ),

  pivot: () => (
    <div className="space-y-5">
      <Section title="Pivot Noktaları Nedir?">
        <p>Pivot noktaları, önceki günün yüksek, düşük ve kapanış fiyatlarından hesaplanan <strong className="text-white">destek ve direnç seviyeleridir</strong>. Gün içi (intraday) ticarette çok popülerdir.</p>
      </Section>
      <Section title="Seviyeler">
        <div className="space-y-2 mt-2">
          <div className="flex items-center gap-2"><span className="text-wallstreet-red text-xs font-mono w-6">R3</span><span>3. Direnç — Çok güçlü direnç (nadiren ulaşılır)</span></div>
          <div className="flex items-center gap-2"><span className="text-wallstreet-red text-xs font-mono w-6">R2</span><span>2. Direnç — Güçlü direnç</span></div>
          <div className="flex items-center gap-2"><span className="text-wallstreet-red text-xs font-mono w-6">R1</span><span>1. Direnç — İlk hedef (kar al noktası)</span></div>
          <div className="flex items-center gap-2"><span className="text-white text-xs font-mono w-6">P</span><span>Pivot Noktası — Günün denge noktası</span></div>
          <div className="flex items-center gap-2"><span className="text-wallstreet-green text-xs font-mono w-6">S1</span><span>1. Destek — İlk destek (dip alımı)</span></div>
          <div className="flex items-center gap-2"><span className="text-wallstreet-green text-xs font-mono w-6">S2</span><span>2. Destek — Güçlü destek</span></div>
          <div className="flex items-center gap-2"><span className="text-wallstreet-green text-xs font-mono w-6">S3</span><span>3. Destek — Son kale (nadiren kırılır)</span></div>
        </div>
      </Section>
      <Tip text="Fiyat pivot noktasının üzerinde açılırsa gün boğa eğilimli, altında açılırsa ayı eğilimlidir." />
    </div>
  ),

  signals: () => (
    <div className="space-y-5">
      <Section title="AL/SAT Sinyalleri Nasıl Üretilir?">
        <p>Terminal, birden fazla indikatörü birleştirerek otomatik AL/SAT sinyalleri üretir. Bunlar grafik üzerinde <strong className="text-wallstreet-green">yeşil yukarı ok (AL)</strong> ve <strong className="text-wallstreet-red">kırmızı aşağı ok (SAT)</strong> olarak görünür.</p>
      </Section>
      <Section title="Sinyal Kuralları">
        <ul className="list-disc pl-5 space-y-3 mt-2">
          <li>
            <strong className="text-wallstreet-green">Momentum AL:</strong> RSI 30'un altından yukarı geçiyor + MACD histogram pozitife dönüyor
          </li>
          <li>
            <strong className="text-wallstreet-red">Momentum SAT:</strong> RSI 70'in üstünden aşağı geçiyor + MACD histogram negatife dönüyor
          </li>
          <li>
            <strong className="text-wallstreet-green">Golden Cross:</strong> EMA 9, EMA 50'yi yukarı kesiyor
          </li>
          <li>
            <strong className="text-wallstreet-red">Death Cross:</strong> EMA 9, EMA 50'yi aşağı kesiyor
          </li>
          <li>
            <strong className="text-wallstreet-green">Hacim Patlaması:</strong> Hacim, 20 günlük ortalamanın 2x üzerinde + fiyat yükseliyor
          </li>
        </ul>
      </Section>
      <Warning text="Otomatik sinyaller yatırım tavsiyesi değildir. Her zaman kendi analizinizi yapın ve risk yönetimi uygulayın." />
    </div>
  ),

  security: () => (
    <div className="space-y-5">
      <Section title="API Anahtarlarım Güvende mi?">
        <div className="flex items-start gap-3 mt-2 p-3 bg-wallstreet-green/10 border border-wallstreet-green/30 rounded-lg">
          <Shield className="w-5 h-5 text-wallstreet-green shrink-0 mt-0.5" />
          <p><strong className="text-wallstreet-green">Evet, güvende.</strong> API anahtarlarınız yalnızca sizin tarayıcınızın localStorage'ında saklanır. Hiçbir sunucuya, veritabanına veya üçüncü tarafa gönderilmez.</p>
        </div>
      </Section>
      <Section title="Kim Ne Görebilir?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">Siz:</strong> Tüm ayarlar, API anahtarları, watchlist — sadece sizin tarayıcınızda</li>
          <li><strong className="text-white">Başka bir kullanıcı:</strong> Siteyi kendi tarayıcısından açarsa boş bir sayfa görür, sizin verilerinize erişemez</li>
          <li><strong className="text-white">Sunucu:</strong> Bu uygulama tamamen client-side çalışır. Hiçbir veri sunucuya gönderilmez</li>
        </ul>
      </Section>
      <Section title="Veriler Nerede Saklanıyor?">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li><strong className="text-white">localStorage (tarayıcı):</strong> Watchlist, aktif indikatörler, çizimler, API anahtarları, ayarlar</li>
          <li><strong className="text-white">Yahoo Finance API:</strong> Fiyat verileri anlık olarak çekilir, hiçbir yere kaydedilmez</li>
          <li><strong className="text-white">AI istekleri:</strong> Doğrudan tarayıcınızdan ilgili AI sağlayıcısına gider (OpenAI/Google/Anthropic)</li>
        </ul>
      </Section>
      <Section title="Güvenlik İpuçları">
        <ul className="list-disc pl-5 space-y-2 mt-2">
          <li>API anahtarlarınızı kimseyle paylaşmayın</li>
          <li>Herkese açık bilgisayarlarda API anahtarı girmeyin</li>
          <li>AI provider'larında kullanım limiti ayarlayın (beklenmedik maliyetlere karşı)</li>
          <li>Finnhub ücretsiz plan yeterlidir, kredi kartı gerekmez</li>
        </ul>
      </Section>
    </div>
  ),
};

// ============================================================================
//  Yardımcı Bileşenler
// ============================================================================
function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-white mb-2">{title}</h4>
      <div className="text-xs text-wallstreet-text leading-relaxed">{children}</div>
    </div>
  );
}

function ColorLine({ color, label, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-3 h-3 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
      <div>
        <span className="text-white font-medium text-xs">{label}:</span>
        <span className="text-wallstreet-text text-xs ml-1">{desc}</span>
      </div>
    </div>
  );
}

function LevelBar({ level, color, label, desc }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 text-right shrink-0">
        <span className="text-xs font-bold font-mono" style={{ color }}>{level}</span>
      </div>
      <div>
        <span className="text-white font-medium text-xs">{label}:</span>
        <span className="text-wallstreet-text text-xs ml-1">{desc}</span>
      </div>
    </div>
  );
}

function Tip({ text }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-wallstreet-green/5 border border-wallstreet-green/20 rounded-lg">
      <span className="text-wallstreet-green text-sm shrink-0">💡</span>
      <span className="text-xs text-wallstreet-green">{text}</span>
    </div>
  );
}

function Warning({ text }) {
  return (
    <div className="flex items-start gap-2 p-3 bg-wallstreet-red/5 border border-wallstreet-red/20 rounded-lg">
      <span className="text-wallstreet-red text-sm shrink-0">⚠️</span>
      <span className="text-xs text-wallstreet-red">{text}</span>
    </div>
  );
}

// ============================================================================
//  Ana Bileşen
// ============================================================================
export default function HelpGuide({ isOpen, onClose }) {
  const [activeTopic, setActiveTopic] = useState('overview');
  const [showTopicList, setShowTopicList] = useState(false);

  if (!isOpen) return null;

  const activeTopicData = TOPICS.find(t => t.id === activeTopic);
  const ContentComponent = CONTENT[activeTopic] || CONTENT.overview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-wallstreet-border shrink-0">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-wallstreet-green" />
            Terminal Kullanım Rehberi
          </h2>
          <div className="flex items-center gap-2">
            {/* Topic Selector */}
            <div className="relative">
              <button
                onClick={() => setShowTopicList(!showTopicList)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-wallstreet-dark border border-wallstreet-border hover:border-wallstreet-green/50 text-wallstreet-muted hover:text-white transition-all"
              >
                <span>{activeTopicData?.emoji}</span>
                <span>{activeTopicData?.label}</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${showTopicList ? 'rotate-180' : ''}`} />
              </button>

              {showTopicList && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowTopicList(false)} />
                  <div className="absolute right-0 top-full mt-1 w-64 bg-wallstreet-card border border-wallstreet-border rounded-xl shadow-2xl z-50 max-h-[50vh] overflow-y-auto py-1">
                    {TOPICS.map(topic => (
                      <button
                        key={topic.id}
                        onClick={() => {
                          setActiveTopic(topic.id);
                          setShowTopicList(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs transition-all ${
                          activeTopic === topic.id
                            ? 'bg-wallstreet-green/10 text-wallstreet-green'
                            : 'text-wallstreet-muted hover:text-white hover:bg-wallstreet-dark/50'
                        }`}
                      >
                        <span className="text-sm">{topic.emoji}</span>
                        <span className="font-medium">{topic.label}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <button onClick={onClose} className="text-wallstreet-muted hover:text-wallstreet-red transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Horizontal Topic Pills (quick access) */}
        <div className="flex items-center gap-1 px-4 py-2 border-b border-wallstreet-border overflow-x-auto shrink-0 scrollbar-hide">
          {TOPICS.slice(0, 8).map(topic => (
            <button
              key={topic.id}
              onClick={() => setActiveTopic(topic.id)}
              className={`shrink-0 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                activeTopic === topic.id
                  ? 'bg-wallstreet-green/15 text-wallstreet-green border border-wallstreet-green/30'
                  : 'text-wallstreet-muted hover:text-white border border-transparent hover:bg-wallstreet-dark/50'
              }`}
            >
              {topic.emoji} {topic.label.split(' ')[0]}
            </button>
          ))}
          <span className="text-wallstreet-muted text-[10px] shrink-0 ml-1">+{TOPICS.length - 8} daha →</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{activeTopicData?.emoji}</span>
              {activeTopicData?.label}
            </h3>
          </div>
          <ContentComponent />
        </div>

        {/* Reklam */}
        <div className="px-6 pb-3 shrink-0">
          <AdSlot slot={AD_SLOTS.helpGuide} />
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-wallstreet-border text-center text-[11px] text-wallstreet-muted bg-wallstreet-dark/50 shrink-0">
          ⚠️ Bu rehberdeki bilgiler eğitim amaçlıdır ve yatırım tavsiyesi niteliğinde değildir.
        </div>
      </div>
    </div>
  );
}
