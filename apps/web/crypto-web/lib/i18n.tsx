"use client";

import { ReactNode, useEffect } from "react";
import i18next from "i18next";
import { I18nextProvider, initReactI18next, useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type Locale = "uk" | "en";

const STORAGE_KEY = "crypto-lab-locale";

const uk = {
  "Crypto Thesis Platform": "Платформа криптографічного диплома",
  "Text parsing workspace for crypto experiments":
    "Робочий простір аналізу текстів для криптографічних експериментів",
  "Corpus Builder": "Конструктор корпусів",
  "Prepare texts for encryption analysis":
    "Підготуйте тексти для аналізу шифрування",
  "Upload Gutenberg files or paste raw text, queue parsing in the API, and reuse completed corpora in later cipher experiments.":
    "Завантажуйте файли Gutenberg або вставляйте сирий текст, ставте парсинг у чергу API та повторно використовуйте готові корпуси в подальших експериментах із шифрами.",
  Refresh: "Оновити",
  "View history": "Переглянути історію",
  "Light theme": "Світла тема",
  "Dark theme": "Темна тема",
  Dashboard: "Панель",
  "New Corpus": "Новий корпус",
  "Classical Ciphers": "Класичні шифри",
  "Complex Ciphers": "Складні шифри",
  History: "Історія",
  "Compare Runs": "Порівняння запусків",
  Datasets: "Набори даних",
  Documentation: "Документація",
  "Diploma App": "Дипломний застосунок",
  "Research Mode": "Режим дослідження",
  "Prepare reusable corpora for encryption experiments without returning full word arrays to the browser.":
    "Готуйте багаторазові корпуси для криптографічних експериментів без передавання повних масивів слів у браузер.",
  Configuration: "Налаштування",
  "Create corpus": "Створити корпус",
  Draft: "Чернетка",
  "File upload": "Завантаження файлу",
  "Raw text": "Сирий текст",
  "Corpus title": "Назва корпусу",
  "File type": "Тип файлу",
  "Input files": "Вхідні файли",
  "No files selected.": "Файли не вибрано.",
  "{{count}} files selected": "Вибрано файлів: {{count}}",
  "Browse...": "Огляд...",
  "Input text": "Вхідний текст",
  "Paste Project Gutenberg text here...": "Вставте текст Project Gutenberg тут...",
  "Queueing...": "Додавання в чергу...",
  "Save & queue": "Зберегти й поставити в чергу",
  "Compare preset": "Порівняти пресет",
  "Plain text": "Звичайний текст",
  Markdown: "Markdown",
  CSV: "CSV",
  JSON: "JSON",
  Binary: "Бінарний",
  Completed: "Завершено",
  Queued: "У черзі",
  "Total words": "Усього слів",
  Unique: "Унікальні",
  "Ready for encryption": "Готово до шифрування",
  "Worker backlog": "Черга воркера",
  "Stored across corpora": "Збережено в корпусах",
  "Selected corpus vocabulary": "Словник вибраного корпусу",
  Visualization: "Візуалізація",
  "Parser throughput": "Пропускна здатність парсера",
  "Live preview": "Живий перегляд",
  Comparison: "Порівняння",
  "Corpus preparation": "Підготовка корпусу",
  "Side-by-side": "Поруч",
  "Job Queue": "Черга завдань",
  "Parsed corpora": "Розібрані корпуси",
  Title: "Назва",
  Status: "Статус",
  Words: "Слова",
  Source: "Джерело",
  "No parsed corpora yet.": "Поки немає розібраних корпусів.",
  "Auto Summary": "Автозведення",
  "Corpus details": "Деталі корпусу",
  "Selected corpus": "Вибраний корпус",
  Chars: "Символи",
  Updated: "Оновлено",
  Hurst: "Герст",
  "DFA alpha": "DFA alpha",
  Entropy: "Ентропія",
  "Parsed text id": "ID розібраного тексту",
  "Select a corpus to inspect parser status and metadata.":
    "Виберіть корпус, щоб переглянути статус парсера й метадані.",
  Pending: "Очікується",
  queued: "у черзі",
  processing: "обробляється",
  completed: "завершено",
  failed: "помилка",
  text: "текст",
  file: "файл",
  "Failed to load jobs": "Не вдалося завантажити завдання",
  'Queued "{{title}}" for parsing.':
    'Корпус "{{title}}" додано в чергу парсингу.',
  "Queued {{count}} files for parsing.":
    "Файли додано в чергу парсингу: {{count}}.",
  "Failed to queue text": "Не вдалося поставити текст у чергу",
};

const i18n = i18next.createInstance();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: {} },
    uk: { translation: uk },
  },
  lng: "uk",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  keySeparator: false,
  nsSeparator: false,
  react: { useSuspense: false },
});

function getStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "uk";
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "en" || saved === "uk" ? saved : "uk";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const locale = getStoredLocale();
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.title = i18n.t("Crypto Thesis Platform");
  }, []);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}

export function LanguageSwitcher({ className }: { className?: string }) {
  const { i18n: instance } = useTranslation();
  const locale = (instance.resolvedLanguage ?? instance.language) as Locale;

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  function changeLocale(nextLocale: Locale) {
    window.localStorage.setItem(STORAGE_KEY, nextLocale);
    void instance.changeLanguage(nextLocale);
  }

  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-1 rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#080b16]",
        className,
      )}
    >
      {(["uk", "en"] as const).map((item) => (
        <Button
          key={item}
          type="button"
          size="sm"
          variant={locale === item ? "default" : "ghost"}
          className={cn(
            "h-8 rounded-md text-xs font-semibold",
            locale === item && "bg-cyan-600 text-white hover:bg-cyan-500",
          )}
          onClick={() => changeLocale(item)}
        >
          {item.toUpperCase()}
        </Button>
      ))}
    </div>
  );
}
