import type {TranslationDict} from '../i18n/types';

interface AdSlotProps {
  slotId: string;
  position: 'mid' | 'bottom';
  t: TranslationDict;
}

/**
 * Dedicated Media.net Advertisement Container.
 *
 * Production Integration Guide:
 * 1. Add your Media.net head script in index.html using your Publisher CID:
 *    <script type="text/javascript">
 *      window._mNHandle = window._mNHandle || {};
 *      window._mNHandle.queue = window._mNHandle.queue || [];
 *      medianet_versionId = "3121199";
 *    </script>
 *    <script src="https://contextual.media.net/dmedianet.js?cid=YOUR_CID" async></script>
 * 2. Replace the placeholder inner box below with your Media.net ad tag div:
 *    <div id="YOUR_AD_UNIT_ID"></div>
 *    and push window._mNDetails.loadTag("YOUR_AD_UNIT_ID", "728x90", "YOUR_AD_UNIT_ID").
 * 3. Reserved min-height prevents Cumulative Layout Shift (CLS) and .techcue-ad-slot hides in @media print.
 */
export function AdSlot({slotId, position, t}: AdSlotProps) {
  const note = position === 'mid' ? t.ads.midNote : t.ads.bottomNote;

  return (
    <aside
      aria-label={t.ads.label}
      data-ad-provider="media.net"
      data-ad-slot={slotId}
      className="techcue-ad-slot mx-auto my-8 max-w-7xl px-4 sm:px-6"
    >
      <div className="flex min-h-[100px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-4 py-4 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          {t.ads.label}
        </span>
        <div id={slotId} className="mt-1 text-xs text-slate-500">
          {note}
        </div>
      </div>
    </aside>
  );
}
