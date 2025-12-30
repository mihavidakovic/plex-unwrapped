import { NextIntlClientProvider } from 'next-intl';
import { locales, defaultLocale } from '@/lib/i18n';

type Props = {
  children: React.ReactNode;
  params?: { token: string };
  searchParams?: { lang?: string };
};

export default async function WrappedLayout({
  children,
  searchParams,
}: Props) {
  // Get locale from query param or default to 'en'
  const locale = searchParams?.lang || defaultLocale;

  // Validate locale
  if (!locales.includes(locale as any)) {
    // If invalid locale, fallback to default instead of 404
    const messages = (await import(`@/messages/${defaultLocale}.json`)).default;
    return (
      <NextIntlClientProvider locale={defaultLocale} messages={messages}>
        {children}
      </NextIntlClientProvider>
    );
  }

  // Load messages for the locale
  let messages;
  try {
    messages = (await import(`@/messages/${locale}.json`)).default;
  } catch (error) {
    // If translation file doesn't exist, fall back to English
    messages = (await import(`@/messages/${defaultLocale}.json`)).default;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
    </NextIntlClientProvider>
  );
}
