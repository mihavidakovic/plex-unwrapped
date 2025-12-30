import { locales, defaultLocale, type Locale } from './i18n';

export function getLocaleFromURL(searchParams: URLSearchParams): Locale | null {
  const langParam = searchParams.get('lang');
  if (langParam && locales.includes(langParam as Locale)) {
    return langParam as Locale;
  }
  return null;
}

export function getLocaleFromStorage(): Locale | null {
  if (typeof window === 'undefined') return null;

  const stored = localStorage.getItem('preferredLanguage');
  if (stored && locales.includes(stored as Locale)) {
    return stored as Locale;
  }
  return null;
}

export function getLocaleFromBrowser(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  const browserLang = navigator.language.split('-')[0];
  if (locales.includes(browserLang as Locale)) {
    return browserLang as Locale;
  }
  return defaultLocale;
}

export function determineLocale(searchParams: URLSearchParams): Locale {
  // Priority: URL > localStorage > Browser > Default
  return (
    getLocaleFromURL(searchParams) ||
    getLocaleFromStorage() ||
    getLocaleFromBrowser() ||
    defaultLocale
  );
}

export function setLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('preferredLanguage', locale);
}
