# Опис системи Crypto Thesis Platform

## 1. Призначення системи

Crypto Thesis Platform - це вебзастосунок для підготовки текстових і бінарних корпусів, запуску криптографічних експериментів та порівняння статистичних властивостей даних до, під час і після шифрування.

Система дає змогу:

- завантажувати або вводити тексти вручну;
- створювати корпуси природного тексту;
- генерувати випадкові байтові baseline-корпуси;
- порівнювати природний текст із випадковими байтами;
- запускати класичні шифри Цезаря та Віженера;
- запускати блокові шифри AES, DES і Kalyna;
- працювати з текстовими та бінарними файлами;
- виконувати шифрування і дешифрування;
- зберігати результати у базі даних;
- переглядати проміжні стани шифрування;
- аналізувати метрики Hurst, DFA, DEA та ентропію;
- завантажувати підготовлені корпуси й результати шифрування.

Головна ідея системи - не просто зашифрувати файл, а показати, як змінюється статистична структура даних під дією різних алгоритмів, режимів і додаткових перетворень.

## 2. Архітектура

Проєкт організований як monorepo:

- `apps/api/crypto-api` - backend на NestJS;
- `apps/web/crypto-web` - frontend на Next.js;
- `shared/types` - спільні типи для алгоритмів і статусів;
- `compose.yml` - інфраструктурний файл для запуску сервісів;
- `pnpm-workspace.yaml` - конфігурація workspace.

Backend використовує:

- NestJS для HTTP API;
- TypeORM для роботи з базою даних;
- PostgreSQL як основне сховище;
- worker threads для важких обчислень;
- Swagger decorators для опису API.

Frontend використовує:

- Next.js;
- React;
- TypeScript;
- компоненти UI;
- `i18next` для української та англійської локалізації;
- API proxy routes, які передають запити з вебзастосунку до backend API.

## 3. Основні модулі backend

### 3.1. Text Parser

Модуль `text-parser` відповідає за створення, збереження та аналіз корпусів.

Він підтримує такі джерела:

- `manual` - текст введений вручну;
- `upload` - текст або файл завантажений користувачем;
- `generated` - згенеровані випадкові байти.

Типи корпусів:

- `natural_text` - природний текст;
- `random_bytes` - випадкові байти.

Статуси корпусів:

- `queued` - очікує обробки;
- `processing` - обробляється;
- `completed` - оброблено;
- `failed` - помилка.

Для малих текстів метрики рахуються синхронно. Для великих текстів, більших за 512 KiB, система створює запис у БД і ставить обробку в чергу worker-а.

### 3.2. Classical Ciphers

Модуль `classical-ciphers` відповідає за класичні шифри, їхні проміжні кроки, фонові job-и та метрики.

Підтримані алгоритми:

- `caesar` - шифр Цезаря;
- `vigenere_key_symbols` - Віженер із покроковим застосуванням символів ключа;
- `vigenere_key_lengths` - Віженер із порівнянням різних довжин ключа.

Підтримані операції:

- `encrypt` - шифрування;
- `decrypt` - дешифрування.

Статуси job-ів:

- `queued`;
- `processing`;
- `completed`;
- `failed`.

Класичні шифри можуть працювати як із UTF-8 текстом, так і з бінарними даними, які зберігаються як hex. Для бінарних даних операції виконуються над байтами за модулем 256.

### 3.3. Complex Ciphers

Модуль `complex-ciphers` відповідає за блокові шифри.

Підтримані алгоритми:

- `aes` - AES;
- `des` - DES;
- `kalyna` - Kalyna / ДСТУ 7624:2014.

Підтримані операції:

- `encrypt`;
- `decrypt`.

Підтримані режими блокового шифру:

- `ecb` - Electronic Codebook;
- `cbc` - Cipher Block Chaining.

Підтримані кодування вхідних, ключових і вихідних даних:

- `utf8`;
- `hex`;
- `base64`.

Для AES і DES доступне XOR whitening. Для Kalyna використовується власна схема раундових перетворень Kalyna з додаванням ключів за модулем `2^64` всередині алгоритму.

### 3.4. Experiments

Модуль `experiments` зберігає базові експерименти з полями:

- назва;
- вхідний текст;
- алгоритм `aes`, `des` або `kalyna`;
- режим `ecb`, `cbc` або `ctr`;
- прапорець whitening;
- статус експерименту.

Цей модуль виглядає як ранній або допоміжний шар системи. Основна робота застосунку зараз реалізована через `text-parser`, `classical-ciphers` і `complex-ciphers`.

## 4. Підготовка корпусів

Система приймає такі типи файлів:

- `plain-text` - `.txt`, `.text`;
- `markdown` - `.md`, `.markdown`;
- `csv` - `.csv`;
- `json` - `.json`;
- `binary` - будь-який файл як набір байтів.

Для текстових форматів файл читається як UTF-8. Для binary-файлів байти перетворюються в hex-рядок і зберігаються з кодуванням `hex`.

Режими препроцесингу тексту:

- `none` - залишає текст без очищення;
- `gutenberg` - видаляє службові блоки Project Gutenberg;
- `auto` - автоматично визначає Gutenberg-маркери й видаляє службовий header/footer, якщо вони знайдені.

Після препроцесингу природний текст нормалізується:

- переводиться в нижній регістр;
- усі не літерні символи замінюються пробілами;
- повторні пробіли стискаються;
- текст розбивається на слова.

## 5. Baseline-корпуси

Система підтримує baseline-порівняння:

- природний текст;
- випадкові байти такої самої або заданої довжини.

Baseline set має спільний `baselineSetId`, який зв'язує природний корпус і його випадкову пару.

Випадкові байти можуть створюватися двома способами:

- криптографічно випадково через `randomBytes`;
- відтворювано через `seed`, де використовується простий LCG-генератор.

Максимальна довжина випадкового baseline - 10 MiB.

## 6. Метрики

Система обчислює набір статистичних метрик для текстів, байтів, проміжних кроків і фінальних шифротекстів.

### 6.1. Базові метрики корпусу

Для кожного корпусу зберігаються:

- `totalWords` - загальна кількість слів або hex-чанків;
- `totalChars` - кількість символів у словах або кількість байтів;
- `uniqueWords` - кількість унікальних слів або унікальних hex-чанків;
- `hurstExponent` - показник Герста;
- `dfaAlpha` - коефіцієнт DFA;
- `deaDelta` - коефіцієнт DEA;
- `wordFrequencyEntropy` - ентропія слів або байтів.

### 6.2. Hurst exponent

Показник Герста оцінює довготривалу залежність у числовій послідовності.

Для тексту використовується ряд довжин слів. Для байтів використовується ряд значень байтів `0..255`.

Типова інтерпретація:

- близько `0.5` - шумоподібна поведінка;
- більше `0.5` - персистентність;
- менше `0.5` - антиперсистентність.

### 6.3. DFA alpha

DFA, або detrended fluctuation analysis, оцінює зміну флуктуацій на різних масштабах після вилучення локального тренду.

У системі DFA використовується для порівняння структури до і після шифрування.

### 6.4. DEA delta

DEA, або diffusion entropy analysis, будує перекривні траєкторії, рахує ентропію Шеннона на різних масштабах і оцінює нахил залежності ентропії від `ln(t)`.

Ця метрика доповнює Hurst і DFA, бо дивиться на поширення розподілу через ентропію.

### 6.5. Entropy

Для текстів ентропія рахується за частотами слів.

Для бінарних даних ентропія рахується за розподілом значень байтів.

Для байтових даних максимум близький до 8 біт на байт, але реальне значення залежить від розміру даних і рівномірності розподілу.

### 6.6. Метрики кроків шифрування

Кожен крок шифрування може містити:

- `step` - номер кроку;
- `description` - опис кроку;
- `text` - проміжний стан;
- `keyLength` - довжина ключа для експериментів Віженера;
- `hurstExponent`;
- `dfaAlpha`;
- `deaDelta`;
- `wordFrequencyEntropy`;
- `wordHurstExponent`;
- `wordDfaAlpha`;
- `wordDeaDelta`;
- `wordEntropy`;
- `byteHurstExponent`;
- `byteDfaAlpha`;
- `byteDeaDelta`;
- `byteEntropy`.

Для набору кроків система також формує агреговану статистику:

- фінальне значення;
- середнє;
- стандартне відхилення;
- мінімум;
- максимум.

## 7. Класичні шифри

### 7.1. Шифр Цезаря

Параметри:

- `shift` - зсув алфавіту від `-1000` до `1000`;
- `maxSteps` - максимальна кількість збережених проміжних кроків для великих текстів;
- `operation` - `encrypt` або `decrypt`;
- `whiteningEnabled` - додаткове whitening-перетворення.

Для тексту шифр Цезаря:

- працює зі словами;
- зсуває літери;
- підтримує латинський та український алфавіти;
- зберігає регістр;
- не змінює символи, які не входять до підтриманих алфавітів.

Для великих текстів кроки зберігаються як checkpoints: наприклад, "зашифровано N із M слів".

Для binary-режиму шифр Цезаря:

- читає hex як байти;
- додає `shift` до кожного байта за модулем 256;
- повертає hex.

### 7.2. Віженер за символами ключа

Параметри:

- `key` - ключ;
- `operation`;
- `whiteningEnabled`.

Для тексту:

- із ключа беруться тільки літери;
- кожна літера ключа перетворюється на зсув;
- проміжні стани показують результат після застосування кожного символу ключа;
- підтримуються латиниця та українська абетка.

Для binary-режиму:

- ключ кодується як UTF-8 байти;
- кожен байт ключа додається до байтів вхідних даних за модулем 256;
- проміжні кроки показують застосування окремих байтів ключа.

### 7.3. Віженер за довжинами ключа

Параметри:

- `key`;
- `keyLengths`;
- `operation`;
- `whiteningEnabled`.

Цей режим призначений для порівняння різних ефективних довжин ключа.

За замовчуванням використовуються довжини:

- `1`;
- `3`;
- `5`;
- `10`;
- `20`.

Користувач може передати власний список довжин. Значення сортуються, дублікати прибираються.

Для кожної довжини ключ повторюється або обрізається до потрібної довжини, після чого система шифрує дані й рахує метрики.

### 7.4. Whitening для класичних шифрів

Для текстових класичних шифрів whitening застосовується як byte post-whitening після основного шифрування.

Для binary-режиму whitening застосовується як pre/post перетворення:

- перед шифруванням байти XOR-яться з псевдовипадковим потоком;
- після шифрування результат знову XOR-иться з іншим потоком;
- seed залежить від зсуву Цезаря або ключа Віженера.

У metadata може зберігатися порівняння:

- стан без whitening;
- стан із whitening;
- різниця метрик;
- статус `random-like` або `structured`.

## 8. Блокові шифри

### 8.1. AES

AES реалізований у коді застосунку, без виклику зовнішнього crypto API для самого алгоритму.

Підтримані розміри ключа:

- 128 біт;
- 192 біти;
- 256 біт.

Підтримані режими:

- `ecb`;
- `cbc`.

Параметри:

- `plaintext` або `ciphertext`;
- `key`;
- `inputEncoding`;
- `keyEncoding`;
- `outputEncoding`;
- `mode`;
- `iv`;
- `ivEncoding`;
- `whiteningEnabled`;
- `kPre`;
- `kPost`;
- `whiteningKeyEncoding`.

Для шифрування використовується PKCS#7 padding.

Проміжні кроки AES включають:

- initial AddRoundKey;
- раунди AES;
- final round;
- додатково XOR pre-whitening і XOR post-whitening, якщо whitening увімкнено.

Для великих даних система може не зберігати всі раундові метрики. Поріг для детального збору кроків - 250 000 байтів padded plaintext.

### 8.2. DES

DES також реалізований у коді застосунку.

Параметри:

- `plaintext` або `ciphertext`;
- `key`, який має декодуватися в 8 байтів;
- `inputEncoding`;
- `keyEncoding`;
- `outputEncoding`;
- `mode`;
- `iv`;
- `ivEncoding`;
- `whiteningEnabled`;
- `kPre`;
- `kPost`;
- `whiteningKeyEncoding`.

Підтримані режими:

- `ecb`;
- `cbc`.

DES використовує:

- початкову перестановку;
- 16 раундів Feistel-мережі;
- S-box підстановки;
- фінальну перестановку;
- PKCS#7 padding.

Для CBC IV має бути 8 байтів.

### 8.3. Kalyna

Kalyna - український блоковий шифр ДСТУ 7624:2014.

Підтримані розміри блоку:

- 128 біт;
- 256 біт;
- 512 біт.

Параметри:

- `plaintext` або `ciphertext`;
- `key`;
- `blockSizeBits`;
- `inputEncoding`;
- `keyEncoding`;
- `outputEncoding`;
- `mode`;
- `iv`;
- `ivEncoding`.

Підтримані режими:

- `ecb`;
- `cbc`.

Для Kalyna в metadata зберігаються:

- режим;
- розмір блоку;
- розмір ключа;
- кількість раундів;
- тип внутрішнього whitening як `additive_mod_2^blockSizeBits`;
- довжина plaintext і ciphertext;
- byte entropy;
- інформація про sampling проміжних кроків.

## 9. XOR whitening для AES і DES

Для AES і DES доступна формула:

```text
Y = E_K(X xor K_pre) xor K_post
```

Параметри:

- `whiteningEnabled` - увімкнути або вимкнути whitening;
- `kPre` - pre-whitening ключ;
- `kPost` - post-whitening ключ;
- `whiteningKeyEncoding` - кодування ключів whitening.

Якщо `kPre` або `kPost` не задані явно, система виводить їх із основного ключа.

Ключі whitening повинні мати довжину блоку:

- 16 байтів для AES;
- 8 байтів для DES.

Система може автоматично порівнювати запуск із whitening і без whitening:

- фінальний шифротекст;
- byte entropy;
- статистику метрик по кроках.

## 10. Черги й worker-и

Важкі операції виконуються через worker threads.

Окремі черги є для:

- парсингу великих текстів;
- класичних шифрів;
- блокових шифрів.

Job містить:

- `id`;
- `parsedTextId`;
- алгоритм;
- параметри;
- статус;
- фінальний текст;
- проміжні кроки;
- метрики;
- прогрес;
- повідомлення про помилку;
- час створення й оновлення.

Для block cipher worker-ів встановлений timeout 900 секунд.

Job можна видалити. Якщо job ще в черзі, він прибирається з черги. Якщо job виконується, worker завершується.

## 11. API endpoints

### 11.1. Text Parser

- `GET /text-parser` - список корпусів;
- `GET /text-parser/:id` - один корпус;
- `GET /text-parser/:id/content` - вміст корпусу для завантаження;
- `POST /text-parser/text` - створення корпусу з тексту;
- `POST /text-parser/file` - створення корпусу з одного файлу;
- `POST /text-parser/files` - створення корпусів із кількох файлів;
- `POST /text-parser/random` - генерація випадкових байтів;
- `POST /text-parser/baseline-set` - baseline-пара з тексту;
- `POST /text-parser/baseline-set/file` - baseline-пара з файлу.

### 11.2. Classical Ciphers

- `GET /classical-ciphers/jobs` - список job-ів;
- `GET /classical-ciphers/jobs/:id` - один job;
- `DELETE /classical-ciphers/jobs/:id` - зупинити й видалити job;
- `POST /classical-ciphers/caesar` - синхронне шифрування Цезаря;
- `POST /classical-ciphers/vigenere/key-symbols` - синхронний Віженер за символами ключа;
- `POST /classical-ciphers/vigenere/key-lengths` - синхронний Віженер за довжинами ключа;
- `POST /classical-ciphers/jobs/caesar` - job Цезаря для існуючого корпусу;
- `POST /classical-ciphers/jobs/caesar/files` - batch job-и Цезаря для файлів;
- `POST /classical-ciphers/jobs/vigenere/key-symbols` - job Віженера за символами ключа;
- `POST /classical-ciphers/jobs/vigenere/key-symbols/files` - batch job-и Віженера за символами;
- `POST /classical-ciphers/jobs/vigenere/key-lengths` - job Віженера за довжинами ключа;
- `POST /classical-ciphers/jobs/vigenere/key-lengths/files` - batch job-и Віженера за довжинами.

### 11.3. Complex Ciphers

- `GET /complex-ciphers/jobs` - список job-ів;
- `GET /complex-ciphers/jobs/:id` - один job;
- `DELETE /complex-ciphers/jobs/:id` - зупинити й видалити job;
- `POST /complex-ciphers/aes/encrypt` - синхронне AES-шифрування;
- `POST /complex-ciphers/aes/decrypt` - синхронне AES-дешифрування;
- `POST /complex-ciphers/des/encrypt` - синхронне DES-шифрування;
- `POST /complex-ciphers/des/decrypt` - синхронне DES-дешифрування;
- `POST /complex-ciphers/kalyna/encrypt` - Kalyna-шифрування;
- `POST /complex-ciphers/kalyna/decrypt` - Kalyna-дешифрування;
- `POST /complex-ciphers/jobs/aes` - AES job для існуючого корпусу;
- `POST /complex-ciphers/jobs/des` - DES job для існуючого корпусу;
- `POST /complex-ciphers/jobs/kalyna` - Kalyna job для існуючого корпусу;
- `POST /complex-ciphers/jobs/aes/files` - batch AES job-и для файлів;
- `POST /complex-ciphers/jobs/des/files` - batch DES job-и для файлів;
- `POST /complex-ciphers/jobs/kalyna/files` - batch Kalyna job-и для файлів.

### 11.4. Experiments

- `GET /experiments`;
- `GET /experiments/:id`;
- `POST /experiments`.

## 12. Що зберігається у базі даних

### 12.1. `parsed_texts`

Зберігає корпуси:

- `id`;
- `title`;
- `source`;
- `corpusKind`;
- `baselineSetId`;
- `originalFileName`;
- `status`;
- `words`;
- `content`;
- `contentEncoding`;
- `totalWords`;
- `totalChars`;
- `uniqueWords`;
- `hurstExponent`;
- `dfaAlpha`;
- `deaDelta`;
- `wordFrequencyEntropy`;
- `errorMessage`;
- `createdAt`;
- `updatedAt`.

### 12.2. `classical_cipher_jobs`

Зберігає класичні шифрувальні job-и:

- `id`;
- `parsedTextId`;
- `algorithm`;
- `parameters`;
- `status`;
- `finalText`;
- `steps`;
- `metricStats`;
- `progressPercent`;
- `progressProcessed`;
- `progressTotal`;
- `progressMessage`;
- `errorMessage`;
- `createdAt`;
- `updatedAt`.

### 12.3. `complex_cipher_jobs`

Зберігає job-и AES, DES і Kalyna:

- `id`;
- `parsedTextId`;
- `algorithm`;
- `parameters`;
- `status`;
- `finalText`;
- `steps`;
- `metadata`;
- `metricStats`;
- `progressPercent`;
- `progressProcessed`;
- `progressTotal`;
- `progressMessage`;
- `errorMessage`;
- `createdAt`;
- `updatedAt`.

### 12.4. `experiments`

Зберігає базові експерименти:

- `id`;
- `title`;
- `inputText`;
- `algorithm`;
- `mode`;
- `whiteningEnabled`;
- `status`;
- `createdAt`;
- `updatedAt`.

## 13. Які файли система приймає

Для створення корпусів:

- `.txt`;
- `.text`;
- `.md`;
- `.markdown`;
- `.csv`;
- `.json`;
- будь-який binary-файл.

Для batch-шифрування файли спочатку перетворюються на корпуси, а потім для кожного файлу створюється окремий cipher job.

Для binary-файлів:

- вміст читається як bytes;
- у БД зберігається hex;
- метрики рахуються за байтовою послідовністю;
- фінальний результат шифрування часто повертається як hex або base64.

## 14. Які файли система генерує або віддає користувачу

Система переважно не створює постійні файли на диску. Вона зберігає дані у PostgreSQL, а файли формуються під час завантаження у браузері.

### 14.1. Завантаження корпусу

Endpoint `GET /text-parser/:id/content` повертає:

- `filename`;
- `contentEncoding`;
- `content`;
- `mimeType`.

Якщо корпус має `originalFileName`, система використовує очищену версію початкової назви файлу.

Якщо початкової назви немає, назва генерується зі slug-а title:

- для UTF-8 тексту: `<slug>.txt`;
- для hex/binary-корпусу: `<slug>.bin`.

У браузері:

- UTF-8 корпус завантажується як text/plain;
- hex-корпус декодується назад у bytes і завантажується як application/octet-stream.

### 14.2. Завантаження результатів класичних шифрів

Frontend формує:

- `<algorithm>-<jobId8>.txt` - фінальний шифротекст або розшифрований текст;
- `<algorithm>-<jobId8>-binary.txt` - побітове представлення результату.

`jobId8` - перші 8 символів UUID job-а.

Для класичних шифрів binary-download не завжди є сирим `.bin`: frontend перетворює результат на рядок бітів і зберігає його як `.txt`.

### 14.3. Завантаження результатів AES, DES і Kalyna

Frontend формує:

- `<algorithm>-<jobId8>-<outputEncoding>.txt` - encoded ciphertext/plaintext;
- `<algorithm>-<jobId8>-<outputEncoding>-binary.txt` - бітове представлення результату;
- `<algorithm>-result-<outputEncoding>-binary.txt` - binary-view для синхронного результату.

Приклади:

- `aes-1a2b3c4d-hex.txt`;
- `des-1a2b3c4d-base64.txt`;
- `kalyna-1a2b3c4d-hex-binary.txt`;
- `aes-result-hex-binary.txt`.

## 15. Frontend-сторінки

Основні сторінки:

- `/` - dashboard для корпусів, baseline і підготовки текстів;
- `/classical-ciphers` - робочий простір класичних шифрів;
- `/complex-ciphers` - робочий простір AES, DES і Kalyna;
- `/documentation` - вбудована довідка про метрики, типи файлів і workflow.

Dashboard показує:

- форму створення корпусу;
- список корпусів;
- деталі вибраного корпусу;
- baseline comparison;
- метрики природного й випадкового корпусу.

Classical Ciphers workspace показує:

- вибір корпусу;
- параметри Цезаря або Віженера;
- batch upload;
- таблицю job-ів;
- прогрес worker-а;
- фінальний результат;
- графіки метрик за кроками;
- таблицю проміжних станів.

Complex Ciphers workspace показує:

- AES/DES/Kalyna controls;
- вибір операції encrypt/decrypt;
- ключ, IV, режим, кодування;
- block size для Kalyna;
- XOR whitening для AES/DES;
- batch upload;
- job queue;
- round metrics;
- whitening comparison;
- фінальний encoded результат.

## 16. Режими роботи з даними

Система підтримує кілька сценаріїв:

1. Створення корпусу з тексту.
2. Створення корпусу з одного файлу.
3. Створення кількох корпусів із batch upload.
4. Генерація випадкового baseline.
5. Створення baseline-пари natural/random.
6. Синхронний запуск шифру на малому введенні.
7. Фоновий запуск шифру на збереженому корпусі.
8. Batch-шифрування файлів.
9. Дешифрування з використанням готового source job-а.
10. Порівняння метрик між природним текстом, random baseline і encrypted output.

## 17. Особливості реалізації

- Для великих обсягів даних система не блокує HTTP-запит, а використовує worker threads.
- Для великих блокових шифрувань раундові метрики можуть пропускатися, щоб не перевантажувати БД і пам'ять.
- Для фінальної оцінки великих ciphertext використовується sampling до 50 000 байтів.
- Для проміжних кроків AES/DES/Kalyna використовується sampled view, якщо повний текст завеликий.
- Для класичного Цезаря максимальна кількість checkpoints обмежена 500.
- Для кроків із дуже довгим текстом зберігається обрізана версія з позначкою truncation.
- Для дешифрування job може брати ciphertext із попереднього завершеного job-а через `sourceJobId`.
- Видалення parsed text каскадно видаляє пов'язані cipher job-и.

## 18. Короткий висновок

Система є дослідницькою платформою для криптографічного аналізу текстових і бінарних даних. Вона поєднує підготовку корпусів, класичні шифри, сучасні блокові шифри, фонову обробку, проміжні стани алгоритмів і статистичні метрики. Її головна цінність - можливість не тільки отримати шифротекст, а й побачити, як саме змінюються структурні характеристики даних на кожному етапі експерименту.
