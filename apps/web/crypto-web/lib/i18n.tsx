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
  "DFA alpha": "DFA-альфа",
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
    "Виберіть розібраний корпус із бази даних, поставте завдання шифрування в чергу та перегляньте, як показники Герста, DFA-альфа й ентропії слів змінюються крок за кроком.",
  "Select a parsed corpus from the database, queue a cipher job, and inspect how Hurst, DFA alpha, DEA, and word entropy move step by step.":
    "Виберіть розібраний корпус із бази даних, поставте завдання шифрування в чергу та перегляньте, як показники Герста, DFA-альфа, DEA й ентропії слів змінюються крок за кроком.",
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
  Progress: "Прогрес",
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
  "Download binary": "Завантажити бінарний файл",
  "Step log": "Журнал кроків",
  "Intermediate states": "Проміжні стани",
  "Step statistics will appear after the worker records metric values.":
    "Статистика кроків з'явиться після того, як воркер запише значення метрик.",
  "Step statistics": "Статистика кроків",
  "mean +/- SD": "середнє +/- СВ",
  "Hurst exponent": "Показник Герста",
  DEA: "DEA",
  "DEA delta": "DEA-дельта",
  "Word entropy": "Ентропія слів",
  "Word H": "H слова",
  "Byte H": "H байтів",
  "Key length": "Довжина ключа",
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
  Caesar: "Цезар",
  "Corpus worker": "Воркер корпусів",
  "Queue {{cipher}} job": "Поставити {{cipher}}-завдання",
  "Queue {{cipher}} {{operation}} job":
    "Поставити {{cipher}}-завдання: {{operation}}",
  "Queue AES job": "Поставити AES-завдання",
  "The worker uses the AES key, mode, IV, and output encoding from the controls above. Binary files are sent as byte payloads and stored as encoded ciphertext.":
    "Воркер використовує AES-ключ, режим, IV та кодування виходу з налаштувань вище. Бінарні файли надсилаються як байтові дані та зберігаються як закодований шифротекст.",
  "The worker uses the selected cipher key, mode, IV, and output encoding from the controls above. Binary files are sent as byte payloads and stored as encoded ciphertext.":
    "Воркер використовує ключ, режим, IV та кодування виходу вибраного шифру з налаштувань вище. Бінарні файли надсилаються як байтові дані та зберігаються як закодований шифротекст.",
  "The worker uses the selected cipher operation, key, mode, IV, input encoding, and output encoding from the controls above.":
    "Воркер використовує вибрану операцію шифру, ключ, режим, IV, кодування входу та кодування виходу з налаштувань вище.",
  "Queue corpus job": "Поставити завдання корпусу",
  "Refresh jobs": "Оновити завдання",
  "AES corpus jobs": "AES-завдання корпусів",
  "Complex cipher corpus jobs": "Завдання корпусів для складних шифрів",
  Polling: "Опитування",
  "No AES corpus jobs yet.": "AES-завдань корпусів ще немає.",
  "No complex cipher corpus jobs yet.":
    "Завдань корпусів для складних шифрів ще немає.",
  "Select or queue an AES corpus job.": "Виберіть або поставте AES-завдання корпусу.",
  "Select or queue a complex cipher corpus job.":
    "Виберіть або поставте завдання корпусу для складного шифру.",
  "Worker output": "Вихід воркера",
  "Stored ciphertext": "Збережений шифротекст",
  "Stored plaintext": "Збережений відкритий текст",
  "Encrypted result": "Зашифрований результат",
  "No encrypted {{cipher}} results yet.":
    "Ще немає зашифрованих результатів {{cipher}}.",
  "No encrypted results for this cipher yet.":
    "Ще немає зашифрованих результатів для цього шифру.",
  Mode: "Режим",
  "Key size": "Розмір ключа",
  "Block size": "Розмір блоку",
  "Block size (bits)": "Розмір блоку (біти)",
  "{{count}} bits": "{{count}} біт",
  "Byte entropy": "Байтова ентропія",
  "Cipher bytes": "Байти шифру",
  "Download ciphertext": "Завантажити шифротекст",
  "Download plaintext": "Завантажити відкритий текст",
  "AES round states will appear after the corpus worker completes.":
    "Стани раундів AES з'являться після завершення воркера корпусу.",
  "AES rounds": "Раунди AES",
  "{{cipher}} rounds": "Раунди {{cipher}}",
  "Round states will appear after the corpus worker completes.":
    "Стани раундів з'являться після завершення воркера корпусу.",
  "Sampled corpus state after each round ({{count}} bytes).":
    "Вибірковий стан корпусу після кожного раунду ({{count}} байт).",
  "Corpus state after each round.": "Стан корпусу після кожного раунду.",
  "Sampled corpus state after whitening and each AES round ({{count}} bytes).":
    "Вибірковий стан корпусу після whitening і кожного раунду AES ({{count}} байт).",
  "Corpus state after whitening and each AES round.":
    "Стан корпусу після whitening і кожного раунду AES.",
  "{{count}} states": "{{count}} станів",
  State: "Стан",
  "AES round metrics chart": "Графік метрик раундів AES",
  "Round metrics chart": "Графік метрик раундів",
  "Hurst, DFA, and entropy metrics will appear after the worker completes.":
    "Метрики Герста, DFA та ентропії з'являться після завершення воркера.",
  "Hurst, DFA, DEA, and entropy metrics will appear after the worker completes.":
    "Метрики Герста, DFA, DEA та ентропії з'являться після завершення воркера.",
  "Round-level charts are omitted because the payload exceeds the detailed-step threshold; ciphertext byte entropy is still shown.":
    "Графіки рівня раундів пропущено, бо дані перевищують поріг детальних кроків; байтова ентропія шифротексту все одно показана.",
  "mean {{mean}} · SD {{sd}}": "середнє {{mean}} · СВ {{sd}}",
  "AES metrics chart": "Графік метрик AES",
  "Complex cipher metrics chart": "Графік метрик складного шифру",
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
  "Complex Cipher Lab": "Лабораторія складних шифрів",
  "Run the backend AES implementation directly and inspect encoded input, key, IV, and output parameters in one place.":
    "Запускайте backend-реалізацію AES напряму й переглядайте закодований вхід, ключ, IV та параметри виходу в одному місці.",
  "Run backend AES and DES implementations directly and inspect encoded input, key, IV, and output parameters in one place.":
    "Запускайте backend-реалізації AES і DES напряму та переглядайте закодований вхід, ключ, IV і параметри виходу в одному місці.",
  "Complex cipher lab": "Лабораторія складних шифрів",
  "AES encryption and decryption": "Шифрування та дешифрування AES",
  "AES and DES encryption and decryption": "Шифрування та дешифрування AES і DES",
  "Work with AES-128, AES-192, and AES-256 keys through the API module, switching between CBC and ECB modes plus hex, base64, and UTF-8 data.":
    "Працюйте з ключами AES-128, AES-192 і AES-256 через API-модуль, перемикаючись між режимами CBC та ECB і даними hex, base64 та UTF-8.",
  "Work with AES and DES through the API module, switching between CBC and ECB modes plus hex, base64, and UTF-8 data.":
    "Працюйте з AES і DES через API-модуль, перемикаючись між режимами CBC та ECB і даними hex, base64 та UTF-8.",
  "Load test vector": "Завантажити тестовий вектор",
  "AES controls": "Налаштування AES",
  "{{cipher}} controls": "Налаштування {{cipher}}",
  Encrypt: "Шифрувати",
  Decrypt: "Дешифрувати",
  encrypt: "шифрування",
  decrypt: "дешифрування",
  "Plaintext encoding": "Кодування відкритого тексту",
  "Ciphertext encoding": "Кодування шифротексту",
  "Output encoding": "Кодування виходу",
  Key: "Ключ",
  "Key encoding": "Кодування ключа",
  IV: "IV",
  "IV encoding": "Кодування IV",
  "ECB mode does not use an IV.": "Режим ECB не використовує IV.",
  "Run {{cipher}}": "Запустити {{cipher}}",
  "Run AES": "Запустити AES",
  Input: "Вхід",
  Plaintext: "Відкритий текст",
  Ciphertext: "Шифротекст",
  "Use last ciphertext": "Використати останній шифротекст",
  "AES result": "Результат AES",
  "{{cipher}} result": "Результат {{cipher}}",
  "{{count}}-bit key": "{{count}}-бітний ключ",
  "Run {{cipher}} to see the encoded result.":
    "Запустіть {{cipher}}, щоб побачити закодований результат.",
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
  "Queue complex cipher jobs": "Поставити завдання складних шифрів",
  "Use AES, DES, or Kalyna controls for key, mode, IV, block size, and encoding, then queue one corpus or a batch of uploaded files.":
    "Налаштуйте AES, DES або Kalyna: ключ, режим, IV, розмір блоку та кодування, а потім поставте в чергу один корпус або пакет файлів.",
  "Binary files are encrypted as bytes. Complex cipher output can be rendered as hex, base64, or UTF-8 when valid.":
    "Бінарні файли шифруються як байти. Вихід складного шифру можна подати як hex, base64 або UTF-8, якщо це коректно.",
  "Read charts": "Читати графіки",
  "Step charts show how Hurst, DFA, and entropy evolve through intermediate states.":
    "Графіки кроків показують, як Герст, DFA та ентропія змінюються через проміжні стани.",
  "Step charts show how Hurst, DFA, DEA, and entropy evolve through intermediate states.":
    "Графіки кроків показують, як Герст, DFA, DEA та ентропія змінюються через проміжні стани.",
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
  "Compare source baselines, final metric values, step progression, and output encoding. Binary entropy is most meaningful when read as byte entropy.":
    "Порівнюйте вихідні baseline, фінальні значення метрик, динаміку кроків і кодування виходу. Бінарна ентропія найкраще читається як байтова ентропія.",
  "Low entropy can mean structured input or too little data.":
    "Низька ентропія може означати структурований вхід або замало даних.",
  "AES output should generally increase byte entropy.":
    "Вихід AES зазвичай має підвищувати байтову ентропію.",
  "AES, DES, and Kalyna output should generally increase byte entropy.":
    "Вихід AES, DES і Kalyna зазвичай має підвищувати байтову ентропію.",
  "Classical ciphers preserve more visible structure than AES.":
    "Класичні шифри зберігають більше видимої структури, ніж AES.",
  "Classical ciphers usually preserve more visible structure than block ciphers.":
    "Класичні шифри зазвичай зберігають більше видимої структури, ніж блокові шифри.",
  "Corpus and baseline preparation": "Підготовка корпусів і baseline",
  "The dashboard stores reusable corpora, random byte baselines, and paired natural/random baseline sets for later experiments.":
    "Панель зберігає багаторазові корпуси, baseline випадкових байтів і парні набори natural/random для наступних експериментів.",
  "Use the baseline panel to compare source structure against random bytes and the latest completed encrypted output.":
    "Використовуйте панель baseline, щоб порівнювати структуру джерела з випадковими байтами та останнім завершеним шифрованим виходом.",
  "Classical cipher experiments": "Експерименти з класичними шифрами",
  "The classical workspace queues Caesar and Vigenere jobs, supports file batches, and can add pre/post modular whitening shifts.":
    "Простір класичних шифрів ставить у чергу завдання Цезаря й Віженера, підтримує пакети файлів і може додавати pre/post модульні whitening-зсуви.",
  "Step tables expose word H, byte H, DFA, DEA, and entropy so weak structure preservation is visible.":
    "Таблиці кроків показують H слова, H байтів, DFA, DEA та ентропію, щоб було видно слабке збереження структури.",
  "Complex cipher experiments": "Експерименти зі складними шифрами",
  "The complex workspace runs AES, DES, and Kalyna directly and through corpus jobs with selectable encodings.":
    "Простір складних шифрів запускає AES, DES і Kalyna напряму та через завдання корпусів із вибором кодування.",
  "AES and DES support CBC/ECB and whitening comparison; Kalyna exposes block-size selection for 128, 256, and 512-bit blocks.":
    "AES і DES підтримують CBC/ECB та порівняння whitening; Kalyna має вибір розміру блоку 128, 256 і 512 біт.",
  Reference: "Довідка",
  "Metric notes and workflow rules for text, binary, classical cipher, and AES experiments.":
    "Нотатки про метрики та правила роботи для текстових, бінарних, класичних і AES-експериментів.",
  "0.0 - 1.0": "0.0 - 1.0",
  "trend scale": "шкала тренду",
  "entropy slope": "нахил ентропії",
  "0 - 8 bits": "0 - 8 біт",
  "Shows long-range dependence in a numeric sequence. Around 0.5 usually means noise-like behavior. Values above 0.5 suggest persistence; values below 0.5 suggest anti-persistence.":
    "Показує довготривалу залежність у числовій послідовності. Значення близько 0.5 зазвичай означає поведінку, схожу на шум. Значення вище 0.5 вказують на персистентність, нижче 0.5 - на антиперсистентність.",
  "For text, the sequence is built from letters. For binary payloads, it is built from byte values 0-255.":
    "Для тексту послідовність будується з літер. Для бінарних даних - зі значень байтів 0-255.",
  "Detrended fluctuation analysis estimates how fluctuations change across scales after local trends are removed.":
    "Аналіз детрендованих флуктуацій оцінює, як флуктуації змінюються між масштабами після вилучення локальних трендів.",
  "Use it to compare structure before and after encryption. Strong ciphers should reduce visible structure in byte-level data.":
    "Використовуйте це для порівняння структури до та після шифрування. Сильні шифри мають зменшувати видиму структуру в байтових даних.",
  "Diffusion entropy analysis builds overlapping trajectories, computes Shannon entropy at each scale, and estimates the slope of S(t) against ln(t).":
    "Аналіз дифузійної ентропії будує перекривні траєкторії, обчислює ентропію Шеннона на кожному масштабі та оцінює нахил S(t) відносно ln(t).",
  "DEA complements Hurst and DFA by reading distribution spreading through entropy rather than variance.":
    "DEA доповнює Герста й DFA, читаючи розширення розподілу через ентропію, а не через дисперсію.",
  "Entropy measures uncertainty. Text jobs use word/letter distribution; binary jobs use byte distribution.":
    "Ентропія вимірює невизначеність. Текстові завдання використовують розподіл слів/літер; бінарні - розподіл байтів.",
  "For binary files, random-looking encrypted output should often land near 6-8 depending on file size and source data.":
    "Для бінарних файлів випадкоподібний зашифрований вихід часто має бути близько 6-8 залежно від розміру файлу та вихідних даних.",
  "Random baseline": "Рандомний baseline",
  "Baseline pair": "Пара baseline",
  Preprocess: "Препроцесинг",
  "Auto (detect Gutenberg)": "Авто (виявити Gutenberg)",
  None: "Без обробки",
  Gutenberg: "Gutenberg",
  "Paste plain text here...": "Вставте звичайний текст тут...",
  "Saving...": "Збереження...",
  "Save & compute metrics": "Зберегти й порахувати метрики",
  "Generate random baseline": "Згенерувати рандомний baseline",
  "Create baseline pair": "Створити пару baseline",
  'Saved "{{title}}" with metrics.': 'Збережено «{{title}}» з метриками.',
  "Saved {{count}} corpora for {{title}}.":
    "Збережено {{count}} корпусів для «{{title}}».",
  "Failed to save corpus": "Не вдалося зберегти корпус",
  "Text or file is required for baseline pair":
    "Для пари baseline потрібен текст або файл",
  "Byte length": "Довжина у байтах",
  "Optional seed": "Необовʼязковий seed",
  "Leave empty for crypto random": "Залиште порожнім для crypto random",
  "Or upload plain text file": "Або завантажте файл plain text",
  Kind: "Тип",
  "Natural text": "Природний текст",
  "Random bytes": "Випадкові байти",
  "Baseline comparison": "Порівняння baseline",
  "Select a natural text corpus to compare baselines.":
    "Оберіть корпус природного тексту для порівняння baseline.",
  Encrypted: "Зашифрований",
  "No completed cipher job": "Немає завершеного job шифрування",
  "No random sibling": "Немає парного random корпусу",
  generated: "згенеровано",
  natural_text: "природний текст",
  random_bytes: "випадкові байти",
  "Baseline metrics": "Метрики baseline",
  "Download corpus text": "Завантажити текст корпусу",
  "Downloading...": "Завантаження...",
  "Failed to download text": "Не вдалося завантажити текст",
  "Failed to load cipher data": "Не вдалося завантажити дані шифрів",
  "Failed to load cipher data. Check API deployment.":
    "Не вдалося завантажити дані шифрів. Перевірте розгортання API.",
  "Failed to load complex cipher jobs":
    "Не вдалося завантажити завдання складних шифрів",
  "Failed to load complex cipher data. Check API deployment.":
    "Не вдалося завантажити дані складних шифрів. Перевірте розгортання API.",
  "No completed parsed text selected.":
    "Не вибрано жодного завершеного розібраного тексту.",
  "Enter at least one key length.": "Введіть хоча б одну довжину ключа.",
  "Select at least one file.": "Виберіть хоча б один файл.",
  "Cipher job queued.": "Завдання шифрування поставлено в чергу.",
  "Queued {{count}} file cipher jobs.":
    "Поставлено в чергу завдань шифрування файлів: {{count}}.",
  "Cipher job stopped and deleted.":
    "Завдання шифрування зупинено й видалено.",
  "Failed to queue job": "Не вдалося поставити завдання в чергу",
  "Failed to queue jobs": "Не вдалося поставити завдання в чергу",
  "Failed to delete cipher job": "Не вдалося видалити завдання шифрування",
  "{{cipher}} encryption completed.": "Шифрування {{cipher}} завершено.",
  "{{cipher}} decryption completed.": "Дешифрування {{cipher}} завершено.",
  "{{cipher}} request failed": "Запит {{cipher}} не виконано",
  "{{cipher}} corpus job queued.":
    "Завдання корпусу {{cipher}} поставлено в чергу.",
  "Failed to queue {{cipher}} job":
    "Не вдалося поставити {{cipher}}-завдання в чергу",
  "Queued {{count}} {{cipher}} file jobs.":
    "Поставлено в чергу {{cipher}}-завдань для файлів: {{count}}.",
  "Failed to queue {{cipher}} jobs":
    "Не вдалося поставити {{cipher}}-завдання в чергу",
  "Complex cipher job stopped and deleted.":
    "Завдання складного шифру зупинено й видалено.",
  "Failed to delete complex cipher job":
    "Не вдалося видалити завдання складного шифру",
  "Loaded AES-128 block test vector.":
    "Завантажено тестовий вектор AES-128 block.",
  "Loaded DES block test vector.": "Завантажено тестовий вектор DES block.",
  "Loaded Kalyna-128/128 ECB test vector.":
    "Завантажено тестовий вектор Kalyna-128/128 ECB.",
  Processing: "Обробляється",
  Loading: "Завантаження",
  "Loading...": "Завантаження...",
  "Processed {{processed}} of {{total}}":
    "Оброблено {{processed}} з {{total}}",
  "Waiting for worker progress.": "Очікування прогресу воркера.",
  Whitening: "Вибілювання",
  "Extra pre/post modular shifts around Caesar or Vigenere.":
    "Додаткові pre/post модульні зсуви навколо Цезаря або Віженера.",
  "Language structure": "Структура мови",
  "No word series": "Немає словесного ряду",
  "Word-level H answers whether language structure survived.":
    "H на рівні слів показує, чи збереглася мовна структура.",
  "Byte stream": "Байтовий потік",
  "No byte series": "Немає байтового ряду",
  "Byte-level H answers whether ciphertext resembles random bytes.":
    "H на рівні байтів показує, чи шифротекст схожий на випадкові байти.",
  "Language structure reduced": "Структуру мови зменшено",
  "Language structure preserved": "Структуру мови збережено",
  "Random-like byte stream": "Байтопотік схожий на випадковий",
  "Structured byte stream": "Структурований байтопотік",
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
