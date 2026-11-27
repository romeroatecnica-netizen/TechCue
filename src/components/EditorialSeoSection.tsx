import {ChevronDown, Info} from 'lucide-react';
import {useState} from 'react';
import type {TranslationDict} from '../i18n/types';

interface EditorialSeoSectionProps {
  t: TranslationDict;
}

export function EditorialSeoSection({t}: EditorialSeoSectionProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section id="guide" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Applied Mechanics Guide */}
      <div className="rounded-xl border border-slate-300 bg-white p-6 sm:p-8">
        <div className="max-w-3xl">
          <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900 text-balance">
            {t.editorial.heading}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-600">{t.editorial.intro}</p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {t.editorial.guides.map((guide) => (
            <article
              key={guide.title}
              className="rounded-xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 className="font-display text-base font-bold text-slate-900">{guide.title}</h3>
              <p className="mt-2 rounded-lg border border-slate-800 bg-[#0B1220] px-3 py-2 font-mono-tabular text-xs font-medium text-sky-300">
                {guide.formula}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-700">{guide.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                {guide.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#EA580C]" aria-hidden="true" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        {/* Interactive Collapsible FAQ */}
        <div id="faq" className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="font-display text-xl font-bold text-slate-900">{t.editorial.faqHeading}</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-xl border border-slate-300 bg-white">
            {t.editorial.faqs.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={item.q}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-start text-sm font-semibold text-slate-900 hover:bg-slate-50 cursor-pointer"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                  {isOpen && (
                    <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm leading-relaxed text-slate-600">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Transparent Disclaimer */}
        <div className="mt-8 flex items-start gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-xs leading-relaxed text-slate-600">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#1D4ED8]" aria-hidden="true" />
          <p>{t.editorial.disclaimer}</p>
        </div>
      </div>
    </section>
  );
}
