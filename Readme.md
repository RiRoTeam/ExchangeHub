# ExchangeHub

> Платформа для поиска малоизвестных, экспериментальных и нишевых программ стажировок и международного обмена.

---

## Содержание

- [Концепция](#концепция)
- [Локальный backend с dev-данными](#локальный-backend-с-dev-данными)
- [Функциональные требования](#функциональные-требования)
- [Архитектура](#архитектура)
- [Стек технологий](#стек-технологий)
- [Структура базы данных](#структура-базы-данных)
- [REST API](#rest-api)
- [Статусная модель](#статусная-модель)

---

## Концепция

ExchangeHub — мобильное приложение (iOS, Android) с веб-админкой, где пользователи находят малопопулярные программы стажировок и обменов, отслеживают дедлайны и предлагают новые программы через форму заявки.

**Ключевая идея:** не агрегатор крупных программ (Erasmus, AIESEC), а база нишевых, экспериментальных и малоизвестных возможностей — с механизмом пополнения самим сообществом.

## Локальный backend с dev-данными

Профиль `dev` добавляет в каталог три идемпотентных примера: с прошедшим,
сегодняшним и будущим дедлайнами, а также с разным временем создания. В других
профилях сид не запускается.

```bash
SPRING_PROFILES_ACTIVE=dev docker compose up -d --build db backend
```

Для повторного запуска очищать базу не нужно: сид не дублирует уже добавленные
примеры и не перезаписывает изменённые вручную данные.

После работы остановите и удалите контейнеры:

```bash
docker compose down --remove-orphans
```

---

## Функциональные требования

### Для пользователей

| # | Функция | Описание |
|---|---------|----------|
| F-01 | Каталог программ | Список программ с пагинацией и фильтрами (страна, сфера, длительность, язык, тип) |
| F-02 | Поиск | Полнотекстовый поиск по названию и описанию |
| F-03 | Карточка программы | Дедлайн, требования, организация, ссылка на сайт, теги, отзывы |
| F-04 | Закладки | Сохранение программ для быстрого доступа |
| F-05 | Трекер статусов | Пользователь отмечает стадию: интересует / подал / жду / принят / отказ |
| F-06 | Уведомления | Пуш-напоминания о приближающихся дедлайнах и новых программах по интересам |
| F-07 | Теги | Фильтрация по тегам: «без опыта», «полностью оплачивается», «удалённо», «менее 10 мест» |
| F-08 | Лента новинок | Раздел с недавно добавленными программами |

### Для сообщества

| # | Функция | Описание |
|---|---------|----------|
| C-01 | Форма предложки | Пользователь отправляет заявку на добавление новой программы |
| C-02 | Статус заявки | Пользователь видит статус своей предложки: на рассмотрении / одобрено / отклонено |
| C-03 | Комментарии | Пользователи оставляют отзывы и комментарии к программам |
| C-04 | Счётчик интереса | Отображение числа людей, которые интересуются программой или подали заявку |

### Для администраторов (веб-панель)

| # | Функция | Описание |
|---|---------|----------|
| A-01 | Очередь модерации | Просмотр и обработка входящих предложек |
| A-02 | Редактор программ | Создание и редактирование карточек программ |
| A-03 | Аналитика | Просмотры, клики на сайт программы, динамика интереса |

---

## Архитектура

```
┌────────────┐  ┌────────────┐  ┌────────────────┐
│  iOS       │  │  Android   │  │  Web (admin)   │
│  SwiftUI   │  │  Compose   │  │  React         │
└─────┬──────┘  └─────┬──────┘  └───────┬────────┘
      │               │                 │
      └───────────────┴─────────────────┘
                      │
              ┌───────▼────────┐    ┌─────────────────┐
              │  API Gateway   │───▶│  Auth Service   │
              │  Spring Cloud  │    │  JWT + Security │
              └───┬───┬───┬────┘    └─────────────────┘
                  │   │   │
       ┌──────────┘   │   └──────────────┐
       │              │                  │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼────────┐ ┌──────────────────┐
│  Program    │ │  User      │ │  Submission     │ │  Notification    │
│  Service   │ │  Service   │ │  Service        │ │  Service         │
│  каталог   │ │  профиль   │ │  предложки      │ │  пуши, дедлайны  │
└──────┬──────┘ └─────┬──────┘ └────────┬────────┘ └────────┬─────────┘
       │              │                  │                   │
┌──────▼──────┐ ┌─────▼──────┐ ┌────────▼────────┐ ┌────────▼─────────┐
│ PostgreSQL  │ │  Redis     │ │  Elasticsearch  │ │  FCM / APNs      │
│ основная БД │ │  кэш/сессии│ │  поиск          │ │  уведомления     │
└─────────────┘ └────────────┘ └─────────────────┘ └──────────────────┘
```

---

## Стек технологий

### Backend — Java / Spring Boot

| Технология | Назначение |
|------------|------------|
| Spring Boot 3 | Основной фреймворк |
| Spring Cloud Gateway | API Gateway, единая точка входа |
| Spring Security + JWT | Аутентификация и авторизация |
| Spring Data JPA + Hibernate | ORM, работа с PostgreSQL |
| Spring Data Redis | Кэширование, хранение сессий |
| Firebase Admin SDK | Отправка пуш-уведомлений |
| Flyway | Миграции базы данных |
| Elasticsearch Java Client | Полнотекстовый поиск |
| Swagger / OpenAPI | Документация API |

**Почему PostgreSQL:** реляционная модель с чёткими связями между сущностями, JSONB для гибких полей программ, надёжные транзакции при модерации заявок, нативная интеграция с экосистемой Spring.

### Android — Kotlin

| Технология | Назначение |
|------------|------------|
| Jetpack Compose | UI |
| Retrofit + OkHttp | HTTP-клиент |
| Hilt | Инъекция зависимостей |
| Room | Локальный кэш, офлайн-режим |
| Firebase Messaging SDK | Пуш-уведомления |
| Navigation Compose | Навигация |

### iOS — Swift

| Технология | Назначение |
|------------|------------|
| SwiftUI | UI |
| Alamofire | Сетевой слой |
| Combine | Реактивность и подписки |
| CoreData | Локальный кэш, офлайн-режим |
| UserNotifications + APNs | Пуш-уведомления |
| Keychain | Безопасное хранение токенов |

### Web — React (только admin-панель)

| Технология | Назначение |
|------------|------------|
| React 18 + TypeScript | Основа |
| React Query | Кэш и серверные запросы |
| React Hook Form | Формы модерации |
| Tailwind CSS | Стилизация |

---

## Структура базы данных

### `users`
```sql
id            UUID PRIMARY KEY
email         VARCHAR UNIQUE NOT NULL
name          VARCHAR NOT NULL
avatar_url    VARCHAR
push_token    VARCHAR
created_at    TIMESTAMP DEFAULT NOW()
```

### `programs`
```sql
id             UUID PRIMARY KEY
title          VARCHAR NOT NULL
country        VARCHAR
organization   VARCHAR
description    TEXT
website_url    VARCHAR
field          VARCHAR          -- сфера (IT, медицина, искусство...)
duration       VARCHAR          -- «3 месяца», «1 год»
is_paid        BOOLEAN DEFAULT FALSE
is_remote      BOOLEAN DEFAULT FALSE
deadline       DATE
view_count     INT DEFAULT 0
interest_count INT DEFAULT 0
extra_fields   JSONB            -- нестандартные поля конкретной программы
created_at     TIMESTAMP DEFAULT NOW()
```

### `submissions`
```sql
id             UUID PRIMARY KEY
user_id        UUID REFERENCES users(id)
title          VARCHAR NOT NULL
organization   VARCHAR
website_url    VARCHAR
description    TEXT
status         VARCHAR DEFAULT 'PENDING'  -- PENDING | APPROVED | REJECTED
reject_reason  TEXT
submitted_at   TIMESTAMP DEFAULT NOW()
reviewed_at    TIMESTAMP
```

### `bookmarks`
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
program_id  UUID REFERENCES programs(id)
saved_at    TIMESTAMP DEFAULT NOW()
UNIQUE (user_id, program_id)
```

### `user_program_status`
```sql
id          UUID PRIMARY KEY
user_id     UUID REFERENCES users(id)
program_id  UUID REFERENCES programs(id)
status      VARCHAR  -- INTERESTED | APPLIED | WAITING | ACCEPTED | REJECTED
updated_at  TIMESTAMP DEFAULT NOW()
UNIQUE (user_id, program_id)
```

### `tags`
```sql
id     UUID PRIMARY KEY
name   VARCHAR UNIQUE NOT NULL
color  VARCHAR  -- hex-цвет для UI
```

### `program_tags`
```sql
program_id  UUID REFERENCES programs(id)
tag_id      UUID REFERENCES tags(id)
PRIMARY KEY (program_id, tag_id)
```

### Связи

```
users ──< bookmarks >── programs
users ──< user_program_status >── programs
users ──< submissions ──> programs (при апруве)
programs ──< program_tags >── tags
```

---

## REST API

### Программы

```
GET    /api/programs                  Каталог с фильтрами и пагинацией
GET    /api/programs/{id}             Карточка программы
GET    /api/programs/search?q=...     Полнотекстовый поиск
GET    /api/programs/new              Лента новинок
```

Query-параметры для `/api/programs`:
- `country`, `field`, `is_paid`, `is_remote` — фильтры
- `tag` — фильтр по тегу (можно несколько)
- `page`, `size` — пагинация
- `sort` — `deadline_asc`, `created_at_desc`, `interest_count_desc`

### Предложки

```
POST   /api/submissions               Отправить предложку (auth required)
GET    /api/submissions/my            Мои предложки и их статусы
```

### Закладки

```
POST   /api/bookmarks                 Добавить в закладки
DELETE /api/bookmarks/{programId}     Убрать из закладок
GET    /api/bookmarks                 Мои закладки
```

### Трекер статусов

```
POST   /api/user/program-status       Установить/обновить статус
GET    /api/user/program-status       Все статусы пользователя
```

### Аутентификация

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/refresh
```

### Администрирование (роль ADMIN)

```
GET    /api/admin/submissions         Очередь на модерацию
PATCH  /api/admin/submissions/{id}    Одобрить или отклонить заявку
POST   /api/admin/programs            Создать программу вручную
PUT    /api/admin/programs/{id}       Редактировать программу
GET    /api/admin/analytics           Статистика просмотров и интереса
```

---

## Статусная модель

### Жизненный цикл предложки (`submissions.status`)

```
PENDING ──► APPROVED ──► (автоматически создаётся запись в programs)
        └──► REJECTED   (с указанием причины в reject_reason)
```

### Трекер пользователя (`user_program_status.status`)

```
INTERESTED ──► APPLIED ──► WAITING ──► ACCEPTED
                                   └──► REJECTED
```
