# Crypto Thesis Platform

> Веб-застосунок для підготовки текстових і бінарних корпусів, запуску криптографічних експериментів та порівняння статистичних властивостей даних до і після шифрування.

---

## Автор

- **ПІБ**: Польовий Олег Володимирович
- **Група**: ФеС - 42
- **Керівник**: Горон Богдан Ігорович, доцент
- **Дата виконання**: 2026

---

## Загальна інформація

- **Тип проєкту**: вебзастосунок / дослідницька криптографічна платформа
- **Архітектура**: monorepo з окремим frontend, backend і shared-модулем
- **Frontend**: Next.js, TypeScript, Tailwind CSS, shadcn/ui, Radix UI, lucide-react, i18next
- **Backend**: NestJS, TypeScript, TypeORM, class-validator, Swagger
- **База даних**: PostgreSQL 16
- **Пакетний менеджер**: pnpm
- **Локальна інфраструктура**: Docker Compose для PostgreSQL
- **Підтримувані мови інтерфейсу**: українська та англійська

---

## Призначення проєкту

Мета застосунку - надати інструмент для дослідження того, як класичні та блокові криптографічні алгоритми змінюють структуру текстових і бінарних даних. Система не обмежується простим шифруванням: вона створює корпуси, зберігає експерименти, виконує фонові обчислення та показує метрики, які допомагають порівняти природний текст, випадкові байти й результат шифрування.

Основні задачі, які вирішує застосунок:

- підготовка корпусів із введеного тексту або завантажених файлів;
- нормалізація тексту та очищення Project Gutenberg header/footer;
- генерація випадкових byte baseline-корпусів;
- створення paired baseline-наборів: природний текст + випадкові байти такої ж довжини;
- запуск класичних шифрів Caesar і Vigenere;
- запуск блокових шифрів AES, DES і Kalyna;
- підтримка режимів ECB і CBC для блокових шифрів;
- підтримка кодувань UTF-8, HEX і Base64;
- порівняння проміжних станів шифрування;
- розрахунок Hurst exponent, DFA alpha, DEA delta та entropy;
- збереження результатів у PostgreSQL;
- перегляд статусу фонових задач і прогресу обробки;
- завантаження підготовлених корпусів і результатів шифрування.

---

## Структура репозиторію

```text
.
+-- apps/
|   +-- api/crypto-api/          # NestJS backend API
|   +-- web/crypto-web/          # Next.js frontend
+-- shared/types/                # Спільні enum/type definitions
+-- compose.yml                  # PostgreSQL для локального запуску
+-- pnpm-workspace.yaml          # Конфігурація pnpm workspace
+-- DEPLOYMENT.md                # Нотатки щодо деплою
+-- SYSTEM_OVERVIEW_UK.md        # Розгорнутий опис системи
+-- UML_ARCHITECTURE_UK.md       # Mermaid UML-діаграми архітектури
```

---

## Опис функціоналу

### Підготовка корпусів

- ручне введення тексту;
- завантаження одного або багатьох файлів;
- підтримка `.txt`, `.text`, `.md`, `.markdown`, `.csv`, `.json` і довільних binary-файлів;
- збереження binary-файлів як HEX-послідовностей;
- автоматичне або ручне очищення Gutenberg-розмітки;
- нормалізація природного тексту для статистичного аналізу;
- створення випадкових байтових послідовностей;
- порівняння natural text corpus із random bytes baseline.

### Класичні шифри

- Caesar cipher із додатним або від'ємним зсувом;
- Vigenere cipher за символами ключа;
- Vigenere-дослідження за різними довжинами ключа;
- шифрування та дешифрування;
- підтримка UTF-8 і HEX input;
- фонові job-и для великих корпусів;
- проміжні кроки шифрування;
- опціональне modular whitening до/після основного перетворення.

### Блокові шифри

- AES;
- DES;
- Kalyna / ДСТУ 7624:2014;
- режими ECB та CBC;
- шифрування і дешифрування;
- input/key/output encoding: `utf8`, `hex`, `base64`;
- IV для CBC;
- Kalyna block size: 128, 256 або 512 біт;
- XOR whitening comparison для AES і DES;
- фонові batch job-и для файлів і збережених корпусів.

### Метрики аналізу

- **Hurst exponent** - оцінка довготривалої залежності у послідовності;
- **DFA alpha** - detrended fluctuation analysis для порівняння структури на різних масштабах;
- **DEA delta** - diffusion entropy analysis;
- **Entropy** - ентропія для word/letter або byte distribution;
- **total words / chars / unique words** - базові характеристики корпусу.

---

## Основні сторінки інтерфейсу

| Сторінка             | Призначення                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------- |
| `/`                  | Dashboard для створення корпусів, завантаження файлів, генерації random baseline та перегляду метрик |
| `/classical-ciphers` | Робоча область для Caesar і Vigenere, запуск job-ів, batch upload, перегляд проміжних кроків         |
| `/complex-ciphers`   | Робоча область для AES, DES і Kalyna, налаштування ключів, режимів, IV, кодувань і whitening         |
| `/documentation`     | Вбудований довідник для користувача: workflow, типи файлів, метрики та інтерпретація результатів     |

---

## Опис основних модулів / файлів

| Модуль / файл                                                 | Призначення                                                                     |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `apps/api/crypto-api/src/main.ts`                             | Точка входу NestJS API, глобальна валідація DTO, Swagger за `/docs`             |
| `apps/api/crypto-api/src/app.module.ts`                       | Підключення Database, Experiments, TextParser, ClassicalCiphers, ComplexCiphers |
| `apps/api/crypto-api/src/modules/database/database.module.ts` | TypeORM-підключення до PostgreSQL через `.env` або `DATABASE_URL`               |
| `apps/api/crypto-api/src/modules/text-parser/`\*              | Створення корпусів, парсинг тексту, random baseline, shuffle, метрики           |
| `apps/api/crypto-api/src/modules/classical-ciphers/*`         | Caesar, Vigenere, classical cipher jobs, metric stats, worker thread            |
| `apps/api/crypto-api/src/modules/complex-ciphers/*`           | AES, DES, Kalyna, ECB/CBC, whitening, complex cipher jobs, worker thread        |
| `apps/api/crypto-api/src/modules/experiments/*`               | Допоміжний модуль для збереження експериментів                                  |
| `apps/web/crypto-web/app/page.tsx`                            | Головна сторінка підготовки корпусів                                            |
| `apps/web/crypto-web/app/classical-ciphers/page.tsx`          | Сторінка класичних шифрів                                                       |
| `apps/web/crypto-web/app/complex-ciphers/page.tsx`            | Сторінка блокових шифрів                                                        |
| `apps/web/crypto-web/app/documentation/page.tsx`              | Сторінка документації                                                           |
| `apps/web/crypto-web/app/api/`                                | Next.js route handlers / proxy endpoints до backend API                         |
| `apps/web/crypto-web/features/`                               | UI-компоненти, hooks, API-клієнти та типи frontend-частини                      |
| `shared/types/*`                                              | Спільні типи алгоритмів і статусів                                              |
| `compose.yml`                                                 | Локальний PostgreSQL у Docker                                                   |
| `DEPLOYMENT.md`                                               | Інструкції для локального та production-середовища                              |

---

## Архітектура

```mermaid
flowchart LR
  User["Користувач"] --> Web["Next.js frontend"]
  Web --> Proxy["Next.js API routes / rewrites"]
  Proxy --> API["NestJS backend API"]
  API --> TextParser["TextParserModule"]
  API --> Classical["ClassicalCiphersModule"]
  API --> Complex["ComplexCiphersModule"]
  API --> Experiments["ExperimentsModule"]
  TextParser --> Workers["Worker threads"]
  Classical --> Workers
  Complex --> Workers
  TextParser --> DB[("PostgreSQL")]
  Classical --> DB
  Complex --> DB
  Experiments --> DB
```

Backend API приймає HTTP-запити, валідує DTO через `ValidationPipe`, виконує синхронні операції для малих даних і переносить важкі обчислення у worker threads. Frontend працює як користувацький інтерфейс і як proxy-рівень для API-запитів.

---

## Як запустити проєкт з нуля

### 1. Встановлення інструментів

Потрібно встановити:

- Node.js 20+ або 22.x;
- pnpm 10.x;
- Docker Desktop;
- Git.

Перевірка:

```bash
node -v
pnpm -v
docker -v
git --version
```

### 2. Клонування репозиторію

```bash
git clone git@github.com:OlegPoloviy/crypto-diploma.git
cd crypto-thesis-platform
```

Якщо репозиторій вже відкритий локально, цей крок пропускається.

### 3. Встановлення залежностей

```bash
pnpm install
```

### 4. Запуск PostgreSQL

```bash
docker compose up -d postgres
```

За замовчуванням `compose.yml` створює базу:

```env
POSTGRES_USER=crypto
POSTGRES_PASSWORD=crypto
POSTGRES_DB=crypto
POSTGRES_PORT=5432
```

### 5. Створення `.env` для backend

Створіть файл `apps/api/crypto-api/.env`:

```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=crypto
DATABASE_PASSWORD=crypto
DATABASE_NAME=crypto
DATABASE_SSL=false
TYPEORM_LOGGING=true
PORT=3000
```

Для production можна використовувати один рядок підключення:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
DATABASE_SSL=true
TYPEORM_LOGGING=false
PORT=3000
```

### 6. Міграції бази даних

```bash
pnpm --filter crypto-api migration:run
```

### 7. Запуск backend

```bash
pnpm dev:api
```

Backend буде доступний на:

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

### 8. Запуск frontend

В іншому терміналі:

```bash
pnpm dev:web
```

Frontend буде доступний на:

```text
http://localhost:3001
```

### 9. Збірка всього проєкту

```bash
pnpm build
```

---

## API приклади

Swagger-документація доступна після запуску backend за адресою:

```text
http://localhost:3000/docs
```

### Health check

**GET /**

Перевіряє, чи працює backend.

---

### Створення корпусу з тексту

**POST /text-parser/text**

```json
{
  "title": "Sample text",
  "text": "The quick brown fox jumps over the lazy dog.",
  "originalFileName": "sample.txt",
  "preprocess": "auto"
}
```

Очікуваний результат: створений запис `parsed_texts` зі статусом `completed` або `queued`, якщо текст великий і обробляється у фоні.

---

### Генерація випадкового baseline-корпусу

**POST /text-parser/random**

```json
{
  "title": "Random baseline",
  "byteLength": 4096,
  "seed": 12345
}
```

Використовується для порівняння природного тексту з випадковими байтами.

---

### Отримання списку корпусів

**GET /text-parser**

Повертає створені корпуси з метаданими, статусом і метриками.

---

### Отримання повного вмісту корпусу

**GET /text-parser/:id/content**

Повертає текст або HEX-вміст конкретного корпусу.

---

### Caesar job для збереженого корпусу

**POST /classical-ciphers/jobs/caesar**

```json
{
  "parsedTextId": "5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f",
  "operation": "encrypt",
  "shift": 3,
  "maxSteps": 40,
  "whiteningEnabled": false
}
```

---

### Vigenere job за символами ключа

**POST /classical-ciphers/jobs/vigenere/key-symbols**

```json
{
  "parsedTextId": "5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f",
  "operation": "encrypt",
  "key": "VERYLONGRESEARCHKEY",
  "whiteningEnabled": true
}
```

---

### Vigenere job для порівняння довжин ключа

**POST /classical-ciphers/jobs/vigenere/key-lengths**

```json
{
  "parsedTextId": "5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f",
  "operation": "encrypt",
  "key": "VERYLONGRESEARCHKEY",
  "keyLengths": [1, 3, 5, 10, 20, 100]
}
```

---

### Список classical jobs

**GET /classical-ciphers/jobs**

Повертає збережені задачі класичних шифрів, їхній статус, прогрес, результат і метрики.

---

### AES direct encrypt

**POST /complex-ciphers/aes/encrypt**

```json
{
  "plaintext": "hello world",
  "key": "000102030405060708090a0b0c0d0e0f",
  "inputEncoding": "utf8",
  "keyEncoding": "hex",
  "outputEncoding": "hex",
  "mode": "cbc",
  "iv": "101112131415161718191a1b1c1d1e1f",
  "ivEncoding": "hex"
}
```

---

### DES direct encrypt

**POST /complex-ciphers/des/encrypt**

```json
{
  "plaintext": "hello world",
  "key": "133457799bbcdff1",
  "inputEncoding": "utf8",
  "keyEncoding": "hex",
  "outputEncoding": "hex",
  "mode": "cbc",
  "iv": "1234567890abcdef",
  "ivEncoding": "hex"
}
```

---

### Kalyna direct encrypt

**POST /complex-ciphers/kalyna/encrypt**

```json
{
  "plaintext": "hello world",
  "key": "000102030405060708090a0b0c0d0e0f",
  "blockSizeBits": 128,
  "inputEncoding": "utf8",
  "keyEncoding": "hex",
  "outputEncoding": "hex",
  "mode": "cbc",
  "iv": "101112131415161718191a1b1c1d1e1f",
  "ivEncoding": "hex"
}
```

---

### AES job для збереженого корпусу

**POST /complex-ciphers/jobs/aes**

```json
{
  "parsedTextId": "5a0a9879-cc1c-40fc-87bb-13c33d9a4a7f",
  "operation": "encrypt",
  "key": "000102030405060708090a0b0c0d0e0f",
  "inputEncoding": "utf8",
  "keyEncoding": "hex",
  "outputEncoding": "hex",
  "mode": "cbc",
  "iv": "101112131415161718191a1b1c1d1e1f",
  "ivEncoding": "hex",
  "whiteningEnabled": true
}
```

---

### Список complex jobs

**GET /complex-ciphers/jobs**

Повертає задачі AES, DES і Kalyna зі статусом, прогресом, фінальним текстом, проміжними кроками, metadata та metric stats.

---

## Інструкція для користувача

1. Відкрити `http://localhost:3001`.
2. На головній сторінці створити корпус:

- вставити текст вручну;
- або завантажити файл;
- або згенерувати random baseline.

1. Перевірити метрики корпусу: кількість слів, символів, унікальних слів, Hurst, DFA, DEA, entropy.
2. Для порівняння створити baseline set: natural text + random bytes.
3. Перейти на `/classical-ciphers`, вибрати корпус і запустити Caesar або Vigenere.
4. Переглянути статус задачі, прогрес, проміжні кроки та фінальний результат.
5. Перейти на `/complex-ciphers`, вибрати AES, DES або Kalyna.
6. Задати ключ, режим ECB/CBC, IV для CBC, кодування input/key/output.
7. За потреби увімкнути whitening comparison для AES/DES.
8. Порівняти статистичні метрики до і після шифрування.
9. Завантажити результати або використати їх як вхід для подальшого дешифрування.
10. Відкрити `/documentation`, якщо потрібно пояснити призначення метрик і workflow.

---

## Тестування та перевірки

### Backend unit tests

```bash
pnpm --filter crypto-api test
```

### Backend coverage

```bash
pnpm --filter crypto-api test:cov
```

### Backend lint

```bash
pnpm --filter crypto-api lint:check
```

### Frontend lint

```bash
pnpm --filter crypto-web lint:check
```

### Production build

```bash
pnpm build
```

---

## База даних

Основні таблиці:

| Таблиця                 | Призначення                                                             |
| ----------------------- | ----------------------------------------------------------------------- |
| `parsed_texts`          | Збережені корпуси, їхній вміст, тип, статус і статистичні метрики       |
| `classical_cipher_jobs` | Задачі Caesar/Vigenere, параметри, прогрес, результат, проміжні кроки   |
| `complex_cipher_jobs`   | Задачі AES/DES/Kalyna, параметри, metadata, прогрес, результат, метрики |
| `experiments`           | Допоміжне збереження експериментів                                      |

Міграції розташовані у:

```text
apps/api/crypto-api/src/common/migrations
```

---

## Deployment

Проєкт підготовлений для розділеного deployment:

- **Frontend**: Vercel, директорія `apps/web/crypto-web`;
- **Backend**: Render, директорія `apps/api/crypto-api`;
- **Database**: Supabase PostgreSQL або інший PostgreSQL-compatible сервіс.

Production env для backend:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=<supabase pooled connection string>
DATABASE_SSL=true
TYPEORM_LOGGING=false
```

Production env для frontend:

```env
API_URL=https://your-crypto-api.onrender.com
```

Детальні нотатки наведені у `DEPLOYMENT.md`.

---

## Приклади / скриншоти

### Dashboard підготовки корпусів

На головній сторінці користувач створює корпуси, завантажує файли, генерує random baseline і переглядає базові статистичні метрики.

<img src="assets/dashboard.png" alt="Dashboard підготовки корпусів" width="100%">

### Baseline comparison

Панель baseline дає змогу порівняти природний текст із випадковими байтами та оцінити різницю в Hurst, DFA, DEA й entropy.

<img src="assets/baseline.png" alt="Порівняння natural text і random bytes" width="100%">

### Classical ciphers workspace

Робоча область класичних шифрів підтримує Caesar, Vigenere, batch jobs, вибір корпусу, прогрес виконання та перегляд результатів.

<img src="assets/classical-ciphers.png" alt="Робоча область класичних шифрів" width="100%">

### Classical cipher step details

Деталі кроку показують проміжні стани шифрування й метрики, що дозволяє оцінювати зміну структури даних у процесі перетворення.

<img src="assets/classical-cipher-step-info.png" alt="Деталі проміжного кроку класичного шифру" width="100%">

### Complex ciphers workspace

Робоча область блокових шифрів містить налаштування AES, DES і Kalyna: ключі, режими ECB/CBC, IV, кодування та whitening comparison.

<img src="assets/complex-ciphers.png" alt="Робоча область блокових шифрів" width="100%">

### Вбудована документація

Сторінка документації пояснює workflow застосунку, підтримувані типи файлів, метрики та логіку інтерпретації результатів.

<img src="assets/documentation.png" alt="Сторінка документації" width="100%">

### Swagger API documentation

Backend автоматично формує Swagger-документацію, через яку можна перевірити доступні endpoint-и, DTO та приклади запитів.

<img src="assets/swagger.png" alt="Swagger документація API" width="100%">

---

## Проблеми і рішення

| Проблема                            | Причина                                         | Рішення                                                                            |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Backend не стартує                  | Не створений `.env` або неправильні змінні БД   | Перевірити `apps/api/crypto-api/.env`                                              |
| `ECONNREFUSED` до PostgreSQL        | Docker container не запущений                   | Виконати `docker compose up -d postgres`                                           |
| Помилка міграцій                    | База недоступна або вже має несумісну схему     | Перевірити env і виконати `pnpm --filter crypto-api migration:run`                 |
| Frontend не бачить API              | Backend не запущений або неправильний `API_URL` | Запустити `pnpm dev:api`, перевірити `http://localhost:3000`                       |
| 400 Bad Request                     | DTO не проходить валідацію                      | Перевірити назви полів, enum-значення та формат UUID                               |
| CBC mode повертає помилку           | IV має неправильну довжину                      | Для AES IV = 16 bytes, для DES IV = 8 bytes, для Kalyna - відповідно до block size |
| AES/DES key error                   | Ключ не відповідає потрібній довжині            | AES: 16/24/32 bytes, DES: 8 bytes                                                  |
| Великі файли обробляються не одразу | Дані поставлені у background job                | Перевіряти статус job через UI або `GET /.../jobs/:id`                             |
| UTF-8 результат не читається        | Ciphertext не є валідним UTF-8                  | Використовувати `hex` або `base64` outputEncoding                                  |

---

## Використані джерела / література

- NestJS Documentation
- Next.js Documentation
- React Documentation
- TypeORM Documentation
- PostgreSQL Documentation
- Swagger / OpenAPI Documentation
- NIST FIPS 197: Advanced Encryption Standard (AES)
- NIST FIPS 46-3: Data Encryption Standard (DES)
- ДСТУ 7624:2014: алгоритм блокового симетричного перетворення Kalyna
- Документація Docker і Docker Compose
- Матеріали з аналізу Hurst exponent, DFA, DEA та entropy-based статистичних методів

---

## Ліцензія

Проєкт створений як дипломна робота. У разі публічного поширення потрібно окремо визначити ліцензію репозиторію.
