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
  "Ready corpora": "Готові корпуси",
  "Parsed texts in DB": "Розібрані тексти в БД",
  "Active jobs": "Активні завдання",
  "Queued or processing": "У черзі або обробляються",
  "Stored cipher runs": "Збережені запуски шифрів",
  "Latest DFA": "Останнє DFA",
  "Hurst {{value}}": "Герст {{value}}",
  "Worker Mode": "Режим воркера",
  "Run cipher experiments from stored corpora while the API keeps heavy metric calculations off the request thread.":
    "Запускайте експерименти з шифрами на збережених корпусах, поки API виконує важкі розрахунки метрик поза потоком запиту.",
  "Classical cipher lab": "Лабораторія класичних шифрів",
  "Worker-backed Caesar and Vigenere runs":
    "Запуски Цезаря та Віженера через воркер",
  "Select a parsed corpus from the database, queue a cipher job, and inspect how Hurst, DFA alpha, and word entropy move step by step.":
    "Виберіть розібраний корпус із бази даних, поставте завдання шифрування в чергу та перегляньте, як показники Герста, DFA alpha й ентропії слів змінюються крок за кроком.",
  "New run": "Новий запуск",
  "Queue cipher job": "Поставити завдання шифрування",
  "Parsed corpus": "Розібраний корпус",
  "{{count}} words": "{{count}} слів",
  "File batch title": "Назва пакета файлів",
  "Queue selected files": "Поставити вибрані файли в чергу",
  Symbols: "Символи",
  Lengths: "Довжини",
  Shift: "Зсув",
  "Vigenere key": "Ключ Віженера",
  "Long alphabetic keys are supported; non-letter characters are ignored by the cipher engine.":
    "Підтримуються довгі літерні ключі; нелітерні символи ігноруються рушієм шифру.",
  "Key lengths": "Довжини ключа",
  "Use comma-separated lengths, including multi-digit values such as 10, 100, or 1000.":
    "Використовуйте довжини через кому, зокрема багатозначні значення на кшталт 10, 100 або 1000.",
  "Queue worker run": "Поставити запуск воркера",
  "Worker queue": "Черга воркера",
  "Cipher jobs": "Завдання шифрування",
  Algorithm: "Алгоритм",
  Parameters: "Параметри",
  Steps: "Кроки",
  Actions: "Дії",
  Delete: "Видалити",
  "No cipher jobs yet.": "Завдань шифрування ще немає.",
  "Select or queue a cipher job.": "Виберіть або поставте завдання шифрування.",
  Metrics: "Метрики",
  "Step progression": "Динаміка кроків",
  Output: "Вихід",
  "Final state": "Фінальний стан",
  "Waiting for worker result...": "Очікування результату воркера...",
  "Download encrypted text": "Завантажити зашифрований текст",
  "Step log": "Журнал кроків",
  "Intermediate states": "Проміжні стани",
  "Step statistics will appear after the worker records metric values.":
    "Статистика кроків з'явиться після того, як воркер запише значення метрик.",
  "Step statistics": "Статистика кроків",
  "mean +/- SD": "середнє +/- СВ",
  "Hurst exponent": "Показник Герста",
  "Word entropy": "Ентропія слів",
  "SD {{value}}": "СВ {{value}}",
  "{{metric}} by {{axis}}": "{{metric}} за {{axis}}",
  "key length": "довжиною ключа",
  step: "кроком",
  "Metrics will appear after completion.": "Метрики з'являться після завершення.",
  "X: {{axis}}": "X: {{axis}}",
  "Cipher metrics chart": "Графік метрик шифру",
  Step: "Крок",
  Description: "Опис",
  DFA: "DFA",
  "Text preview": "Попередній перегляд тексту",
  "Waiting for worker steps.": "Очікування кроків воркера.",
  "Vigenere symbols": "Символи Віженера",
  "Vigenere lengths": "Довжини Віженера",
  "Corpus worker": "Воркер корпусів",
  "Queue AES job": "Поставити AES-завдання",
  "The worker uses the AES key, mode, IV, and output encoding from the controls above. Binary files are sent as byte payloads and stored as encoded ciphertext.":
    "Воркер використовує AES-ключ, режим, IV та кодування виходу з налаштувань вище. Бінарні файли надсилаються як байтові дані та зберігаються як закодований шифротекст.",
  "Queue corpus job": "Поставити завдання корпусу",
  "Refresh jobs": "Оновити завдання",
  "AES corpus jobs": "AES-завдання корпусів",
  Polling: "Опитування",
  "No AES corpus jobs yet.": "AES-завдань корпусів ще немає.",
  "Select or queue an AES corpus job.": "Виберіть або поставте AES-завдання корпусу.",
  "Worker output": "Вихід воркера",
  "Stored ciphertext": "Збережений шифротекст",
  Mode: "Режим",
  "Key size": "Розмір ключа",
  "{{count}} bits": "{{count}} біт",
  "Byte entropy": "Байтова ентропія",
  "Cipher bytes": "Байти шифру",
  "Download ciphertext": "Завантажити шифротекст",
  "AES round states will appear after the corpus worker completes.":
    "Стани раундів AES з'являться після завершення воркера корпусу.",
  "AES rounds": "Раунди AES",
  "Sampled corpus state after whitening and each AES round ({{count}} bytes).":
    "Вибірковий стан корпусу після whitening і кожного раунду AES ({{count}} байт).",
  "Corpus state after whitening and each AES round.":
    "Стан корпусу після whitening і кожного раунду AES.",
  "{{count}} states": "{{count}} станів",
  State: "Стан",
  "AES round metrics chart": "Графік метрик раундів AES",
  "Hurst, DFA, and entropy metrics will appear after the worker completes.":
    "Метрики Герста, DFA та ентропії з'являться після завершення воркера.",
  "mean {{mean}} · SD {{sd}}": "середнє {{mean}} · СВ {{sd}}",
  "AES metrics chart": "Графік метрик AES",
  "XOR whitening": "XOR-вибілювання",
  "Y = E_K(X ⊕ K_pre) ⊕ K_post": "Y = E_K(X ⊕ K_pre) ⊕ K_post",
  "Y = E_K(X ⊕ K_pre) ⊕ K_post vs plain E_K(X)":
    "Y = E_K(X ⊕ K_pre) ⊕ K_post проти звичайного E_K(X)",
  "Whitening comparison": "Порівняння вибілювання",
  "Whitening comparison chart": "Графік порівняння вибілювання",
  "Without whitening": "Без вибілювання",
  "With whitening": "З вибілюванням",
  Enabled: "Увімкнено",
  Disabled: "Вимкнено",
  "Round metrics were skipped because this corpus is above the detailed-step threshold ({{threshold}} MB).":
    "Метрики раундів пропущено: корпус перевищує поріг детальних кроків ({{threshold}} МБ).",
  "Normalized against 8 bits per byte.": "Нормалізовано до 8 біт на байт.",
  "AES Lab": "AES-лабораторія",
  "Run the backend AES implementation directly and inspect encoded input, key, IV, and output parameters in one place.":
    "Запускайте backend-реалізацію AES напряму й переглядайте закодований вхід, ключ, IV та параметри виходу в одному місці.",
  "Complex cipher lab": "Лабораторія складних шифрів",
  "AES encryption and decryption": "Шифрування та дешифрування AES",
  "Work with AES-128, AES-192, and AES-256 keys through the API module, switching between CBC and ECB modes plus hex, base64, and UTF-8 data.":
    "Працюйте з ключами AES-128, AES-192 і AES-256 через API-модуль, перемикаючись між режимами CBC та ECB і даними hex, base64 та UTF-8.",
  "Load test vector": "Завантажити тестовий вектор",
  "AES controls": "Налаштування AES",
  Encrypt: "Шифрувати",
  Decrypt: "Дешифрувати",
  "Plaintext encoding": "Кодування відкритого тексту",
  "Ciphertext encoding": "Кодування шифротексту",
  "Output encoding": "Кодування виходу",
  Key: "Ключ",
  "Key encoding": "Кодування ключа",
  "IV encoding": "Кодування IV",
  "ECB mode does not use an IV.": "Режим ECB не використовує IV.",
  "Run AES": "Запустити AES",
  Input: "Вхід",
  "Use last ciphertext": "Використати останній шифротекст",
  "AES result": "Результат AES",
  "{{count}}-bit key": "{{count}}-бітний ключ",
  "Run AES to see the encoded result.": "Запустіть AES, щоб побачити закодований результат.",
  Operation: "Операція",
  "CryptoLab guide": "Довідник CryptoLab",
  "Use this page to understand what each metric means, how file uploads become queued jobs, and how to interpret text and binary encryption runs.":
    "На цій сторінці пояснено значення метрик, як завантажені файли стають завданнями в черзі та як інтерпретувати текстові й бінарні запуски шифрування.",
  "User guide": "Посібник користувача",
  Workflow: "Робочий процес",
  "How to work with the app": "Як працювати із застосунком",
  "Upload one or many files from the dashboard, choose the file type, and let the app create reusable corpus records.":
    "Завантажте один або кілька файлів із панелі, виберіть тип файлу й дозвольте застосунку створити багаторазові записи корпусів.",
  "Text formats are parsed as UTF-8. Binary files are stored as hex payloads with metrics calculated directly from bytes.":
    "Текстові формати розбираються як UTF-8. Бінарні файли зберігаються як hex-дані з метриками, розрахованими напряму з байтів.",
  "Queue classical jobs": "Поставити класичні завдання",
  "Run Caesar or Vigenere jobs from an existing corpus, or upload a batch of files directly in the classical workspace.":
    "Запускайте завдання Цезаря або Віженера з наявного корпусу або завантажуйте пакет файлів прямо в просторі класичних шифрів.",
  "For binary input, classical ciphers operate byte-by-byte modulo 256 and return hex output.":
    "Для бінарного входу класичні шифри працюють побайтно за модулем 256 і повертають hex-вихід.",
  "Queue AES jobs": "Поставити AES-завдання",
  "Use the AES controls for key, mode, IV, and encoding, then queue one corpus or a batch of uploaded files.":
    "Налаштуйте ключ, режим, IV і кодування AES, а потім поставте в чергу один корпус або пакет завантажених файлів.",
  "Binary files are encrypted as bytes. AES output can be rendered as hex, base64, or UTF-8 when valid.":
    "Бінарні файли шифруються як байти. Вихід AES можна подати як hex, base64 або UTF-8, якщо це коректно.",
  "Read charts": "Читати графіки",
  "Step charts show how Hurst, DFA, and entropy evolve through intermediate states.":
    "Графіки кроків показують, як Герст, DFA та ентропія змінюються через проміжні стани.",
  "When a job has one stored step, the UI switches to compact bars because a line chart with one point has no progression.":
    "Коли завдання має один збережений крок, інтерфейс переходить на компактні смуги, бо лінійний графік з однією точкою не показує прогресії.",
  "File types": "Типи файлів",
  "Upload modes": "Режими завантаження",
  "UTF-8 text files such as .txt or .text.": "Текстові файли UTF-8, наприклад .txt або .text.",
  "Markdown is treated as UTF-8 text and parsed into words.":
    "Markdown обробляється як текст UTF-8 і розбирається на слова.",
  "CSV is accepted as text so tables can be analyzed or encrypted.":
    "CSV приймається як текст, щоб таблиці можна було аналізувати або шифрувати.",
  "JSON is accepted as text; structure is preserved in the payload.":
    "JSON приймається як текст; структура зберігається в даних.",
  "Any file type. The app stores bytes as hex and uses byte metrics.":
    "Будь-який тип файлу. Застосунок зберігає байти як hex і використовує байтові метрики.",
  bytes: "байти",
  "Batch queues": "Пакетні черги",
  "Batch upload creates one queued job per file. Jobs reuse the same worker queues as regular corpus jobs, so the status table remains the source of truth.":
    "Пакетне завантаження створює одне завдання в черзі на кожен файл. Завдання використовують ті самі черги воркерів, що й звичайні завдання корпусів, тому таблиця статусів лишається джерелом правди.",
  "Use the dashboard for reusable corpora.": "Використовуйте панель для багаторазових корпусів.",
  "Use cipher workspaces to upload and encrypt files immediately.":
    "Використовуйте простори шифрів, щоб одразу завантажувати й шифрувати файли.",
  "A failed job does not delete completed jobs from other files.":
    "Невдале завдання не видаляє завершені завдання інших файлів.",
  "What to compare": "Що порівнювати",
  "Compare the final metric values, the step progression, and the output encoding. Binary entropy is most meaningful when read as byte entropy.":
    "Порівнюйте фінальні значення метрик, динаміку кроків і кодування виходу. Бінарна ентропія найкраще читається як байтова ентропія.",
  "Low entropy can mean structured input or too little data.":
    "Низька ентропія може означати структурований вхід або замало даних.",
  "AES output should generally increase byte entropy.":
    "Вихід AES зазвичай має підвищувати байтову ентропію.",
  "Classical ciphers preserve more visible structure than AES.":
    "Класичні шифри зберігають більше видимої структури, ніж AES.",
  Reference: "Довідка",
  "Metric notes and workflow rules for text, binary, classical cipher, and AES experiments.":
    "Нотатки про метрики та правила роботи для текстових, бінарних, класичних і AES-експериментів.",
  "0.0 - 1.0": "0.0 - 1.0",
  "trend scale": "шкала тренду",
  "0 - 8 bits": "0 - 8 біт",
  "Shows long-range dependence in a numeric sequence. Around 0.5 usually means noise-like behavior. Values above 0.5 suggest persistence; values below 0.5 suggest anti-persistence.":
    "Показує довготривалу залежність у числовій послідовності. Значення близько 0.5 зазвичай означає поведінку, схожу на шум. Значення вище 0.5 вказують на персистентність, нижче 0.5 - на антиперсистентність.",
  "For text, the sequence is built from letters. For binary payloads, it is built from byte values 0-255.":
    "Для тексту послідовність будується з літер. Для бінарних даних - зі значень байтів 0-255.",
  "Detrended fluctuation analysis estimates how fluctuations change across scales after local trends are removed.":
    "Detrended fluctuation analysis оцінює, як флуктуації змінюються між масштабами після вилучення локальних трендів.",
  "Use it to compare structure before and after encryption. Strong ciphers should reduce visible structure in byte-level data.":
    "Використовуйте це для порівняння структури до та після шифрування. Сильні шифри мають зменшувати видиму структуру в байтових даних.",
  "Entropy measures uncertainty. Text jobs use word/letter distribution; binary jobs use byte distribution.":
    "Ентропія вимірює невизначеність. Текстові завдання використовують розподіл слів/літер; бінарні - розподіл байтів.",
  "For binary files, random-looking encrypted output should often land near 6-8 depending on file size and source data.":
    "Для бінарних файлів випадкоподібний зашифрований вихід часто має бути близько 6-8 залежно від розміру файлу та вихідних даних.",
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
