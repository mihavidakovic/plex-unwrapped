'use client';

import { ReactNode, useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { defaultLocale, locales, type Locale } from '@/lib/i18n';

interface LocaleProviderProps {
  children: ReactNode;
}

export default function LocaleProvider({ children }: LocaleProviderProps) {
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<any>(null);
  const [locale, setLocale] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const loadMessages = async () => {
      // Get locale from URL query parameter
      const urlLocale = searchParams.get('lang');

      // Validate locale
      const validLocale = urlLocale && locales.includes(urlLocale as Locale)
        ? (urlLocale as Locale)
        : defaultLocale;

      setLocale(validLocale);

      // Load messages for the locale
      try {
        const loadedMessages = await import(`@/messages/${validLocale}.json`);
        setMessages(loadedMessages.default);
      } catch (error) {
        console.error(`Failed to load messages for locale: ${validLocale}`, error);
        // Fallback to English
        const fallbackMessages = await import(`@/messages/${defaultLocale}.json`);
        setMessages(fallbackMessages.default);
      }
    };

    loadMessages();
  }, [searchParams]);

  // Show loading state while messages are being loaded
  if (!messages) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-plex-500"></div>
      </div>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
