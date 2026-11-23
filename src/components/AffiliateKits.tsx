import {ExternalLink, Wrench} from 'lucide-react';
import type {TranslationDict} from '../i18n/types';

interface AffiliateKitsProps {
  t: TranslationDict;
}

export function AffiliateKits({t}: AffiliateKitsProps) {
  return (
    <section id="kits" className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">{t.kits.heading}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.kits.subheading}</p>
          </div>
          <p className="text-xs text-slate-500">{t.kits.disclosure}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.kits.items.map((kit) => (
            <article
              key={kit.title}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 transition-colors hover:border-slate-300"
            >
              <div>
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Wrench className="h-3.5 w-3.5 text-[#D97706]" aria-hidden="true" />
                  <span>{kit.category}</span>
                  <span aria-hidden="true">·</span>
                  <span>{kit.priceHint}</span>
                </div>
                <h3 className="mt-2.5 text-base font-bold text-slate-900">{kit.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{kit.description}</p>
              </div>

              <div className="mt-5">
                <a
                  href={kit.url}
                  target="_blank"
                  rel="sponsored nofollow noopener"
                  className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 hover:border-[#2563EB] hover:text-[#2563EB] transition-colors whitespace-nowrap"
                >
                  <span>{t.kits.viewKit}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
