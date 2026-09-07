import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { LOCALES, translate, type Locale, type TranslationKey, type TranslationVars } from './locales';

const STORAGE_KEY = 'ideal-day-lab.locale';
export const APP_DEFAULT_LOCALE: Locale = 'en-US';

const detectSystemLocale = (): Locale => {
  const system = (typeof navigator !== 'undefined' ? navigator.language : '') || '';
  return system.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en-US';
};

const detectInitialLocale = (): Locale => APP_DEFAULT_LOCALE;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, vars?: TranslationVars) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectInitialLocale);

  const setLocale = (next: Locale) => {
    if (!LOCALES.includes(next)) return;
    setLocaleState(next);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'zh-CN'
      ? '理想的一天实验室 — 打造值得偷走的一天'
      : 'Ideal Day Lab — Build a day worth stealing';
  }, [locale]);

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => translate(locale, key, vars),
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <LocaleProvider>');
  return value;
}

/** Compact global language control: System / English / 中文. */
export function LangSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="lang-switch">
      <span className="lang-switch-label" aria-hidden="true">{t('lang.label')}</span>
      <select
        aria-label={t('lang.label')}
        value={locale}
        onChange={(event) => {
          const next = event.target.value;
          setLocale(next === 'system' ? detectSystemLocale() : next as Locale);
        }}
      >
        <option value="system">{t('lang.system')}</option>
        <option value="en-US">{t('lang.en')}</option>
        <option value="zh-CN">{t('lang.zh')}</option>
      </select>
    </label>
  );
}
