import {useEffect} from 'react';
import {
  CANONICAL_ORIGIN,
  getCanonicalUrl,
  getLangDirection,
  SUPPORTED_LANGS,
  type LocaleCode,
} from '../config/seo';
import type {TranslationDict} from '../i18n/types';

function upsertMeta(selector: string, attrs: Record<string, string>, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(selector: string, attrs: Record<string, string>, href: string): void {
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  if (!el) {
    el = document.createElement('link');
    Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

export function useSeoHead(lang: LocaleCode, t: TranslationDict): void {
  useEffect(() => {
    const dir = getLangDirection(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;

    const canonicalUrl = getCanonicalUrl(lang);
    document.title = t.seo.title;

    upsertMeta('meta[name="description"]', {name: 'description'}, t.seo.description);
    upsertMeta('meta[property="og:url"]', {property: 'og:url'}, canonicalUrl);
    upsertMeta('meta[property="og:title"]', {property: 'og:title'}, t.seo.title);
    upsertMeta('meta[property="og:description"]', {property: 'og:description'}, t.seo.description);
    upsertMeta('meta[name="twitter:title"]', {name: 'twitter:title'}, t.seo.title);
    upsertMeta('meta[name="twitter:description"]', {name: 'twitter:description'}, t.seo.description);

    upsertLink('link[rel="canonical"]', {rel: 'canonical'}, canonicalUrl);

    SUPPORTED_LANGS.forEach((code) => {
      upsertLink(
        `link[rel="alternate"][hreflang="${code}"]`,
        {rel: 'alternate', hreflang: code},
        getCanonicalUrl(code)
      );
    });
    upsertLink(
      'link[rel="alternate"][hreflang="x-default"]',
      {rel: 'alternate', hreflang: 'x-default'},
      `${CANONICAL_ORIGIN}/`
    );

    const jsonLd = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          name: t.seo.appName,
          url: canonicalUrl,
          applicationCategory: 'EducationalApplication',
          operatingSystem: 'Web Browser',
          inLanguage: lang,
          description: t.seo.description,
          offers: {
            '@type': 'Offer',
            price: '0',
            priceCurrency: 'USD',
          },
        },
        {
          '@type': 'FAQPage',
          mainEntity: t.editorial.faqs.map((item) => ({
            '@type': 'Question',
            name: item.q,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.a,
            },
          })),
        },
      ],
    };

    let script = document.getElementById('techcue-jsonld') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'techcue-jsonld';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);
  }, [lang, t]);
}
