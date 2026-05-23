# UML-діаграми архітектури Crypto Thesis Platform

## 1. Компонентна діаграма застосунку

```mermaid
flowchart LR
  user["Користувач"]

  subgraph web["Frontend: apps/web/crypto-web"]
    next["Next.js App Router"]
    dashboard["Dashboard /\nпідготовка корпусів"]
    classicalPage["/classical-ciphers\nкласичні шифри"]
    complexPage["/complex-ciphers\nблокові шифри"]
    docsPage["/documentation\nдокументація"]
    ui["UI components\nButton, Input, Tabs, Card"]
    i18n["i18next\nuk/en локалізація"]
    proxy["Next.js API proxy routes\n/app/api/**"]
  end

  subgraph api["Backend: apps/api/crypto-api"]
    nest["NestJS AppModule"]
    dbModule["DatabaseModule\nTypeORM config"]

    subgraph textParser["TextParserModule"]
      textController["TextParserController\n/text-parser"]
      textService["TextParserService"]
      textWorker["text-parser.worker\nважкий аналіз тексту"]
      textUtil["text-parser.util\nнормалізація, метрики"]
    end

    subgraph classical["ClassicalCiphersModule"]
      classicalController["ClassicalCiphersController\n/classical-ciphers"]
      classicalService["ClassicalCiphersService"]
      classicalEngine["classical-ciphers.engine\nCaesar, Vigenere"]
      classicalMetrics["classical-ciphers.metrics\nHurst, DFA, DEA, entropy"]
      classicalWorker["classical-ciphers.worker\nфонова обробка job"]
    end

    subgraph complex["ComplexCiphersModule"]
      complexController["ComplexCiphersController\n/complex-ciphers"]
      complexService["ComplexCiphersService"]
      complexEngine["complex-ciphers.engine\nрежими ECB/CBC"]
      aes["aes.engine"]
      des["des.engine"]
      kalyna["kalyna.engine"]
      whitening["block-cipher-xor-whitening"]
      complexWorker["complex-ciphers.worker\nфонова обробка job"]
    end

    subgraph experiments["ExperimentsModule"]
      expController["ExperimentsController\n/experiments"]
      expService["ExperimentsService"]
    end
  end

  subgraph shared["shared/types"]
    statuses["ExperimentStatus"]
    algorithms["AlgorithmType"]
  end

  postgres[("PostgreSQL\nparsed_texts\nclassical_cipher_jobs\ncomplex_cipher_jobs\nexperiments")]

  user --> next
  next --> dashboard
  next --> classicalPage
  next --> complexPage
  next --> docsPage
  dashboard --> ui
  classicalPage --> ui
  complexPage --> ui
  next --> i18n
  dashboard --> proxy
  classicalPage --> proxy
  complexPage --> proxy

  proxy --> textController
  proxy --> classicalController
  proxy --> complexController

  nest --> dbModule
  nest --> textParser
  nest --> classical
  nest --> complex
  nest --> experiments

  textController --> textService
  textService --> textUtil
  textService --> textWorker

  classicalController --> classicalService
  classicalService --> classicalEngine
  classicalService --> classicalMetrics
  classicalService --> classicalWorker

  complexController --> complexService
  complexService --> complexEngine
  complexEngine --> aes
  complexEngine --> des
  complexEngine --> kalyna
  complexEngine --> whitening
  complexService --> complexWorker

  expController --> expService
  expService --> statuses
  expService --> algorithms

  dbModule --> postgres
  textService --> postgres
  classicalService --> postgres
  complexService --> postgres
  expService --> postgres
```

## 2. Діаграма розгортання і потоків даних

```mermaid
flowchart TB
  browser["Browser\nкористувацький інтерфейс"]

  subgraph nextNode["Node.js process: Next.js"]
    pages["React pages\n/, /classical-ciphers, /complex-ciphers"]
    nextApi["API proxy routes\n/api/text-parser/**\n/api/classical-ciphers/**\n/api/complex-ciphers/**"]
  end

  subgraph nestNode["Node.js process: NestJS API"]
    controllers["Controllers\nHTTP endpoints"]
    services["Services\nбізнес-логіка, черги job"]
    workers["Worker threads\nаналіз тексту та шифрування"]
    engines["Crypto/stat engines\nCaesar, Vigenere, AES, DES, Kalyna,\nHurst, DFA, DEA, entropy"]
    typeorm["TypeORM repositories"]
  end

  db[("PostgreSQL 16\nDocker compose або зовнішня БД")]

  browser -->|"HTTP"| pages
  pages -->|"fetch"| nextApi
  nextApi -->|"HTTP до API_URL"| controllers
  controllers --> services
  services -->|"для великих задач"| workers
  workers --> engines
  services --> engines
  services --> typeorm
  typeorm --> db
```

## 3. Діаграма основних сутностей

```mermaid
classDiagram
  class ParsedTextEntity {
    +uuid id
    +string title
    +ParsedTextSource source
    +ParsedTextCorpusKind corpusKind
    +uuid? baselineSetId
    +string? originalFileName
    +ParsedTextStatus status
    +string[]? words
    +text? content
    +ParsedTextContentEncoding contentEncoding
    +number totalWords
    +number totalChars
    +number uniqueWords
    +number? hurstExponent
    +number? dfaAlpha
    +number? deaDelta
    +number? wordFrequencyEntropy
    +string? errorMessage
    +Date createdAt
    +Date updatedAt
  }

  class ClassicalCipherJobEntity {
    +uuid id
    +uuid parsedTextId
    +ClassicalCipherAlgorithm algorithm
    +ClassicalCipherParameters parameters
    +ClassicalCipherJobStatus status
    +text? finalText
    +CipherStepResponseDto[]? steps
    +CipherMetricStatDto[]? metricStats
    +number progressPercent
    +number progressProcessed
    +number progressTotal
    +string? progressMessage
    +string? errorMessage
    +Date createdAt
    +Date updatedAt
  }

  class ComplexCipherJobEntity {
    +uuid id
    +uuid parsedTextId
    +ComplexCipherAlgorithm algorithm
    +ComplexCipherParameters parameters
    +ComplexCipherJobStatus status
    +text? finalText
    +CipherStepResponseDto[]? steps
    +Record? metadata
    +CipherMetricStatDto[]? metricStats
    +number progressPercent
    +number progressProcessed
    +number progressTotal
    +string? progressMessage
    +string? errorMessage
    +Date createdAt
    +Date updatedAt
  }

  class ExperimentsEntity {
    +uuid id
    +string title
    +text inputText
    +AlgorithmType algorithm
    +CipherMode mode
    +boolean whiteningEnabled
    +ExperimentStatus status
    +Date createdAt
    +Date updatedAt
  }

  ParsedTextEntity "1" --> "0..*" ClassicalCipherJobEntity : parsedTextId
  ParsedTextEntity "1" --> "0..*" ComplexCipherJobEntity : parsedTextId
```

## 4. Основні сценарії використання

```mermaid
sequenceDiagram
  actor User as Користувач
  participant UI as Next.js UI
  participant Proxy as Next.js API proxy
  participant API as NestJS Controller
  participant Service as NestJS Service
  participant Worker as Worker thread
  participant DB as PostgreSQL

  User->>UI: Завантажує або вводить текст
  UI->>Proxy: POST /api/text-parser
  Proxy->>API: POST /text-parser
  API->>Service: створити corpus/job
  Service->>DB: зберегти parsed_text
  alt малий текст
    Service->>Service: розрахувати метрики синхронно
  else великий текст
    Service->>Worker: запустити аналіз у фоні
    Worker-->>Service: метрики та нормалізований результат
  end
  Service->>DB: оновити статус і метрики
  API-->>Proxy: результат або job status
  Proxy-->>UI: JSON відповідь

  User->>UI: Запускає шифрування
  UI->>Proxy: POST /api/classical-ciphers або /api/complex-ciphers
  Proxy->>API: POST /classical-ciphers або /complex-ciphers
  API->>Service: створити cipher job
  Service->>DB: зберегти job
  Service->>Worker: виконати алгоритм
  Worker-->>Service: кроки, фінальний текст, статистики
  Service->>DB: зберегти результат
  UI->>Proxy: GET job status/result
  Proxy->>API: GET job
  API-->>UI: прогрес, результат, метрики
```

## 5. Короткий опис компонентів

- `crypto-web` - клієнтський Next.js застосунок із сторінками для підготовки корпусів, запуску класичних і блокових шифрів, перегляду результатів та документації.
- `Next.js API proxy routes` - проміжний шар, який приховує адресу backend API від UI і проксить запити на `API_URL`.
- `crypto-api` - NestJS backend, що містить HTTP-контролери, сервіси, TypeORM-збереження та worker threads для ресурсоємних задач.
- `TextParserModule` - створення корпусів, нормалізація тексту, генерація випадкових байтів, baseline-набори, обчислення статистичних метрик.
- `ClassicalCiphersModule` - шифри Цезаря та Віженера, покрокове виконання, job-и, метрики результатів.
- `ComplexCiphersModule` - AES, DES, Kalyna, режими ECB/CBC, кодування `utf8/hex/base64`, XOR whitening, job-и та проміжні кроки.
- `ExperimentsModule` - допоміжний модуль для збереження базових експериментів із алгоритмом, режимом, whitening і статусом.
- `PostgreSQL` - основне сховище корпусів, задач шифрування, результатів, прогресу, помилок і метрик.
- `shared/types` - спільні enum-типи для статусів експериментів і алгоритмів.
