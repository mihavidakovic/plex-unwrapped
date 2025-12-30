'use client';

import { useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { locales, localeNames, type Locale } from '@/lib/i18n';

export default function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations('language');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);

  const handleLocaleChange = (newLocale: Locale) => {
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferredLanguage', newLocale);
    }

    // Update URL with query param
    const params = new URLSearchParams(searchParams.toString());
    params.set('lang', newLocale);

    // Construct new URL
    const newUrl = `${pathname}?${params.toString()}`;

    // Navigate to new URL (will trigger re-render with new locale)
    router.push(newUrl);
    router.refresh();

    setIsOpen(false);
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a]/90 backdrop-blur-sm border border-[#333] rounded-lg hover:border-[#ff6b35] transition-colors shadow-lg"
          aria-label={t('select')}
        >
          <svg
            className="w-5 h-5 text-[#888]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
            />
          </svg>
          <span className="font-['DM_Sans'] text-sm text-[#e8e8e8]">
            {localeNames[locale]}
          </span>
          <svg
            className={`w-4 h-4 text-[#888] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute top-full right-0 mt-2 w-48 bg-[#1a1a1a]/95 backdrop-blur-sm border border-[#333] rounded-lg shadow-xl overflow-hidden z-50">
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLocaleChange(loc)}
                  className={`w-full text-left px-4 py-3 font-['DM_Sans'] text-sm transition-colors ${
                    loc === locale
                      ? 'bg-[#ff6b35]/10 text-[#ff6b35]'
                      : 'text-[#e8e8e8] hover:bg-[#2a2a2a]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{localeNames[loc]}</span>
                    {loc === locale && (
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
