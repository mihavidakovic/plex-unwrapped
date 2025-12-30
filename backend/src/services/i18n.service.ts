import * as fs from 'fs';
import * as path from 'path';

export type Locale = 'en' | 'es' | 'fr' | 'de' | 'sl';
export const defaultLocale: Locale = 'en';
export const supportedLocales: Locale[] = ['en', 'es', 'fr', 'de', 'sl'];

interface Translations {
  [key: string]: any;
}

class I18nService {
  private translations: Map<Locale, Translations> = new Map();

  constructor() {
    this.loadTranslations();
  }

  /**
   * Load all translation files
   */
  private loadTranslations(): void {
    for (const locale of supportedLocales) {
      try {
        const filePath = path.join(__dirname, '../locales', `${locale}.json`);

        // Load all available translation files
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf-8');
          this.translations.set(locale, JSON.parse(content));
        }
      } catch (error) {
        console.warn(`Failed to load translations for locale: ${locale}`, error);
      }
    }
  }

  /**
   * Get translation for a key
   * @param key - Translation key in dot notation (e.g., 'email.subject')
   * @param locale - Target locale
   * @param params - Parameters to interpolate into the translation
   * @returns Translated string
   */
  translate(key: string, locale: Locale = defaultLocale, params?: Record<string, any>): string {
    // Fallback to default locale if requested locale not found
    const translations = this.translations.get(locale) || this.translations.get(defaultLocale);

    if (!translations) {
      console.warn(`No translations loaded for locale: ${locale}`);
      return key;
    }

    // Navigate through nested object using dot notation
    const keys = key.split('.');
    let value: any = translations;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        console.warn(`Translation key not found: ${key}`);
        return key;
      }
    }

    // If value is not a string, return the key
    if (typeof value !== 'string') {
      console.warn(`Translation value is not a string: ${key}`);
      return key;
    }

    // Interpolate parameters
    if (params) {
      return this.interpolate(value, params);
    }

    return value;
  }

  /**
   * Interpolate parameters into a string
   * @param template - String with {param} placeholders
   * @param params - Parameters to replace
   * @returns Interpolated string
   */
  private interpolate(template: string, params: Record<string, any>): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  /**
   * Convenience method - shorthand for translate
   */
  t(key: string, locale: Locale = defaultLocale, params?: Record<string, any>): string {
    return this.translate(key, locale, params);
  }

  /**
   * Check if a locale is supported
   */
  isLocaleSupported(locale: string): locale is Locale {
    return supportedLocales.includes(locale as Locale);
  }

  /**
   * Get the appropriate locale, falling back to default if not supported
   */
  getValidLocale(locale?: string): Locale {
    if (locale && this.isLocaleSupported(locale)) {
      return locale;
    }
    return defaultLocale;
  }
}

// Export singleton instance
export const i18n = new I18nService();
