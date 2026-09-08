# Развёртывание ExchangeHub в production

Эта инструкция описывает воспроизводимое развёртывание одного production-инстанса
ExchangeHub на Linux-сервере с Docker Compose. Публичный трафик принимает Caddy,
TLS выпускается автоматически, backend и PostgreSQL не публикуют порты наружу.

> Корневой `docker-compose.yml`, `make up` и `make demo` предназначены только для
> локальной разработки. Для production используется исключительно
> `docker-compose.prod.yml`. Никогда не запускайте `make clean`, `make nuke` или
> `docker compose down -v` на production-сервере.

## Содержание

1. [Архитектура](#архитектура)
2. [Требования](#требования)
3. [Подготовка DNS и firewall](#подготовка-dns-и-firewall)
4. [Получение кода и настройка окружения](#получение-кода-и-настройка-окружения)
5. [Создание секретов](#создание-секретов)
6. [Первый запуск](#первый-запуск)
7. [Создание первого администратора](#создание-первого-администратора)
8. [Проверка после запуска](#проверка-после-запуска)
9. [Обновление](#обновление)
10. [Откат](#откат)
11. [Резервное копирование](#резервное-копирование)
12. [Проверка восстановления](#проверка-восстановления)
13. [Логи и наблюдаемость](#логи-и-наблюдаемость)
14. [Ротация секретов](#ротация-секретов)
15. [Типовые проблемы](#типовые-проблемы)
16. [Production checklist](#production-checklist)

## Архитектура

```text
Internet
   │  TCP 80/443
   ▼
Caddy (TLS, security headers, access log)
   ├── /api/* ───────────────► Spring Boot :8080
   └── остальные запросы ────► nginx frontend :8080
                                      │
Spring Boot ─────────────────────────► PostgreSQL :5432
```

- наружу опубликованы только порты `80` и `443` Caddy;
- сеть `data` помечена `internal`, PostgreSQL доступен только backend;
- PostgreSQL хранит данные в named volume `postgres_data`;
- сертификаты Caddy хранятся в volumes `caddy_data` и `caddy_config`;
- пароли БД и JWT key передаются как Docker secrets из `deploy/secrets`;
- профиль `prod` отключает Swagger/demo-data и включает production-настройки;
- Flyway выполняет миграции при запуске backend, после чего Hibernate проверяет
  соответствие сущностей схеме.

Это single-host конфигурация. Для высокой доступности, point-in-time recovery и
автоматического failover используйте managed PostgreSQL и оркестратор с несколькими
репликами приложения. Встроенный rate limiter хранится в памяти одного backend,
поэтому перед горизонтальным масштабированием его нужно вынести в общий storage или
на edge proxy.

Frontend runtime основан на `nginx-unprivileged` и работает как UID `101` на порту
`8080`. Backend также запускается непривилегированным пользователем. Для PostgreSQL
намеренно не установлен `no-new-privileges`: официальный entrypoint сначала
инициализирует volume, а затем понижает привилегии до пользователя `postgres` через
`gosu`; запрет повышения или смены credentials ломает этот штатный startup.
PostgreSQL при этом не имеет host port и находится только во внутренней сети `data`.
Backend/frontend сбрасывают все Linux capabilities; Caddy сохраняет только
`NET_BIND_SERVICE` для портов 80/443. Для каждого service задан `pids_limit`, а
runtime root filesystems приложения и edge proxy доступны только для чтения.

## Требования

- Linux VPS с актуальными security updates;
- Docker Engine и Docker Compose plugin (`docker compose version`);
- Git, OpenSSL и `curl`;
- доменное имя с доступом к DNS;
- открытые входящие TCP `80` и `443`, SSH только с доверенных адресов;
- рекомендуется от 2 CPU, 2 GB RAM и 20 GB SSD для небольшого инстанса;
- включённый NTP и системное время UTC.

Перед первым запуском убедитесь, что порты свободны:

```bash
sudo ss -lntup | grep -E ':(80|443)[[:space:]]' || true
docker version
docker compose version
```

## Подготовка DNS и firewall

1. Создайте `A`-запись домена на публичный IPv4 сервера.
2. Добавляйте `AAAA` только если IPv6 действительно настроен и разрешён firewall.
3. Дождитесь обновления DNS и проверьте адрес:

```bash
getent ahosts exchangehub.example.com
```

4. Разрешите SSH, HTTP и HTTPS. Пример для UFW:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Caddy автоматически получает сертификат и перенаправляет HTTP на HTTPS, если домен
указывает на сервер и оба порта доступны. Не ставьте другой web server на `80/443`.

## Получение кода и настройка окружения

Разворачивайте проверенный commit из защищённой ветки `main`, а не произвольное
состояние рабочей директории:

```bash
sudo install -d -m 0755 /opt/exchangehub
sudo chown "$(id -un):$(id -gn)" /opt/exchangehub
git clone https://github.com/RiRoTeam/ExchangeHub.git /opt/exchangehub/app
cd /opt/exchangehub/app
git fetch --tags --prune
git checkout main
git pull --ff-only
git status --short
```

`git status --short` перед deploy должен быть пустым. Для повторяемого релиза
зафиксируйте SHA и используйте его как immutable tag собранных образов:

```bash
git rev-parse HEAD
git rev-parse --short=12 HEAD
```

Создайте production env-файл из шаблона:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
```

Отредактируйте `.env.production`:

- `COMPOSE_PROJECT_NAME` — постоянное уникальное имя проекта;
- `RELEASE_TAG` — первые 12 символов текущего Git SHA;
- `DOMAIN` — реальный публичный домен без `https://`;
- `ACME_EMAIL` — адрес для уведомлений центра сертификации;
- `POSTGRES_ADMIN_USER` — bootstrap-администратор PostgreSQL;
- `DB_NAME` — имя базы;
- `DB_APP_USER` — отдельный пользователь приложения, отличный от admin;
- `SECRETS_DIR` — каталог секретов, по умолчанию `./deploy/secrets`;
- memory limits подберите под сервер.

Env-файл не должен содержать пароли или JWT key.

## Создание секретов

Создайте каталог с правами только для владельца:

```bash
install -d -m 0700 deploy/secrets
umask 077
openssl rand -base64 48 | tr -d '\n' > deploy/secrets/postgres_admin_password
openssl rand -base64 48 | tr -d '\n' > deploy/secrets/db_app_password
openssl rand -base64 64 | tr -d '\n' > deploy/secrets/jwt_secret
: > deploy/secrets/bootstrap_admin_email
: > deploy/secrets/bootstrap_admin_name
: > deploy/secrets/bootstrap_admin_password
chmod 0444 deploy/secrets/*
```

Mode `0444` здесь намеренный: обычный Docker Compose подключает file secret как
read-only bind mount и не remap-ит host UID/GID. PostgreSQL и backend работают под
разными non-root UID и не смогут прочитать source-файл с mode `0600`. На host доступ
всё равно закрыт mode `0700` родительского каталога; изменить secret можно атомарной
заменой файла владельцем каталога. Не переносите secret-файлы из защищённого
каталога и не ослабляйте mode самого каталога.

Не копируйте значения в issue, CI logs или shell-команды. Проверьте только наличие и
размер файлов, не выводя содержимое:

```bash
find deploy/secrets -type f -maxdepth 1 -exec stat -c '%a %n %s bytes' {} \;
```

`deploy/secrets`, `.env.production` и дампы исключены из Git. Сделайте отдельную
зашифрованную копию секретов в password manager. Потеря DB passwords или JWT key
может сделать восстановление невозможным либо завершить все пользовательские сессии.

## Первый запуск

Сначала проверьте итоговую Compose-модель. Команда читает пути к секретам, но не
печатает их содержимое:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
```

Соберите образы, запустите стек и дождитесь healthchecks:

```bash
release_tag=$(git rev-parse --short=12 HEAD)
sed -i "s/^RELEASE_TAG=.*/RELEASE_TAG=$release_tag/" .env.production
docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --wait
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker image inspect "exchangehub-backend:$release_tag" "exchangehub-frontend:$release_tag" \
  exchangehub-postgres:16.15-pinned >/dev/null
unset release_tag
```

Base images зафиксированы в Compose/Dockerfile по multi-platform digest, а application
images получают Git-SHA tag. Не удаляйте минимум два последних успешных release-tag;
для нескольких серверов публикуйте эти же immutable images в приватный registry.

При создании пустого PostgreSQL volume init script создаёт:

- отдельного cluster administrator из `POSTGRES_ADMIN_USER`;
- non-superuser `DB_APP_USER`;
- базу, владельцем которой становится `DB_APP_USER`.

Init script выполняется только на пустом data directory. Изменение имён или password
files после инициализации не изменяет существующие роли автоматически.

Backend запускается только после готовности PostgreSQL. Flyway применяет новые
миграции в порядке версий. Если миграция или JPA validation завершается ошибкой,
backend остаётся unhealthy, а Caddy не начинает обслуживать приложение.

## Создание первого администратора

Bootstrap выполняется только при одновременном наличии email, имени и пароля и только
пока в базе нет ни одного ADMIN. Запишите значения без отображения пароля:

```bash
read -r -p 'Admin email: ' bootstrap_email
read -r -p 'Admin name: ' bootstrap_name
read -r -s -p 'Admin password (12-72 chars): ' bootstrap_password
printf '\n'
printf '%s' "$bootstrap_email" > deploy/secrets/bootstrap_admin_email.next
printf '%s' "$bootstrap_name" > deploy/secrets/bootstrap_admin_name.next
printf '%s' "$bootstrap_password" > deploy/secrets/bootstrap_admin_password.next
chmod 0444 deploy/secrets/bootstrap_admin_*.next
mv deploy/secrets/bootstrap_admin_email.next deploy/secrets/bootstrap_admin_email
mv deploy/secrets/bootstrap_admin_name.next deploy/secrets/bootstrap_admin_name
mv deploy/secrets/bootstrap_admin_password.next deploy/secrets/bootstrap_admin_password
unset bootstrap_email bootstrap_name bootstrap_password
```

Если стек уже запущен, пересоздайте только backend:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --wait backend
```

Войдите созданным аккаунтом и убедитесь, что роль — `ADMIN`. Затем немедленно
обнулите одноразовые bootstrap secrets и ещё раз пересоздайте backend:

```bash
install -m 0444 /dev/null deploy/secrets/bootstrap_admin_email.next
install -m 0444 /dev/null deploy/secrets/bootstrap_admin_name.next
install -m 0444 /dev/null deploy/secrets/bootstrap_admin_password.next
mv deploy/secrets/bootstrap_admin_email.next deploy/secrets/bootstrap_admin_email
mv deploy/secrets/bootstrap_admin_name.next deploy/secrets/bootstrap_admin_name
mv deploy/secrets/bootstrap_admin_password.next deploy/secrets/bootstrap_admin_password
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --wait backend
```

Не включайте `dev`/`demo` и не устанавливайте `DEMO_DATA_ENABLED=true` в production.

## Проверка после запуска

Замените домен в командах на свой:

```bash
curl --fail --show-error --silent https://exchangehub.example.com/ >/dev/null
curl --fail --show-error --silent 'https://exchangehub.example.com/api/programs?size=1' >/dev/null
curl --fail --show-error --silent -I https://exchangehub.example.com/ | grep -i strict-transport-security
```

Readiness доступен только внутри backend container:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend \
  wget -qO- http://localhost:8080/actuator/health/readiness
```

Swagger, OpenAPI и Actuator не должны быть публичны:

```bash
test "$(curl -s -o /dev/null -w '%{http_code}' https://exchangehub.example.com/v3/api-docs)" = 404
test "$(curl -s -o /dev/null -w '%{http_code}' https://exchangehub.example.com/actuator/health)" = 404
```

Проверьте миграции без публикации DB-порта:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "TABLE flyway_schema_history;"'
```

Минимальный smoke после каждого deploy: главная страница, регистрация/вход,
пагинированный каталог, создание заявки и ADMIN endpoint. Не используйте реальный
пароль администратора в автоматическом smoke или CI logs.

## Обновление

### Обязательная проверка перед первым обновлением до schema v9

Миграция V8 перестаёт хранить bearer refresh-токены открытым текстом и один раз
отзывает ранее выданные refresh sessions. После rollout пользователям потребуется
войти снова. Миграция V9 приводит email к lowercase и добавляет
case-insensitive uniqueness. Старая схема допускала аккаунты, отличающиеся только
регистром или пробелами, поэтому до backup и остановки rollout проверьте legacy-БД:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
  'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 -c \
  "SELECT lower(btrim(email)) AS normalized_email, array_agg(id ORDER BY id) AS user_ids
   FROM users
   GROUP BY lower(btrim(email))
   HAVING count(*) > 1;"'
```

Пустой результат безопасен для продолжения. Если строки найдены, не запускайте
новый backend: выберите вместе с владельцами аккаунтов, какой user id сохранить,
перенесите на него submissions/favorites и другие связанные записи, отзовите все
refresh tokens конфликтующих аккаунтов, удалите дубликаты и повторите запрос.
Автоматически объединять такие identity небезопасно. V9 также интерпретирует старые
`TIMESTAMP` как UTC — это соответствует прежнему Docker-контуру. Для исторической
БД, работавшей с другой DB/JVM timezone, сначала согласуйте отдельную корректирующую
миграцию.

1. Убедитесь, что CI для нужного commit зелёный.
2. Создайте backup по разделу ниже.
3. Получите код строго fast-forward и запомните старый/new release tag.
4. Соберите immutable application images из pinned base images.
5. Запустите стек и дождитесь readiness.
6. Выполните smoke и проверьте logs.

```bash
cd /opt/exchangehub/app
old_release=$(sed -n 's/^RELEASE_TAG=//p' .env.production)
git fetch origin main --prune
git checkout main
git pull --ff-only
new_release=$(git rev-parse --short=12 HEAD)
printf 'Deploying %s -> %s\n' "$old_release" "$new_release"
sed -i "s/^RELEASE_TAG=.*/RELEASE_TAG=$new_release/" .env.production

docker compose --env-file .env.production -f docker-compose.prod.yml build --pull
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --wait --remove-orphans
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker image inspect "exchangehub-backend:$new_release" "exchangehub-frontend:$new_release" \
  exchangehub-postgres:16.15-pinned >/dev/null
printf 'Rollback tag retained locally: %s\n' "$old_release"
unset old_release new_release
```

Compose пересоздаёт только изменившиеся services. PostgreSQL volume и Caddy
certificates сохраняются. Не запускайте две конкурирующие операции deploy; в CI/CD
используйте concurrency lock и GitHub Environment `production` с required reviewer.

## Откат

Откат приложения возможен только если предыдущий код совместим с уже применённой
схемой:

```bash
previous_release=PREVIOUS_12_CHAR_GIT_SHA
docker image inspect "exchangehub-backend:$previous_release" \
  "exchangehub-frontend:$previous_release" >/dev/null
RELEASE_TAG="$previous_release" docker compose --env-file .env.production \
  -f docker-compose.prod.yml up -d --no-build --wait backend frontend caddy
sed -i "s/^RELEASE_TAG=.*/RELEASE_TAG=$previous_release/" .env.production
unset previous_release
```

Rollback использует уже проверенные images и `--no-build`, поэтому registry/base
image не могут незаметно изменить бинарник во время инцидента. Если старого tag нет
локально, сначала загрузите ровно этот digest/tag из вашего registry или release
archive; не пересобирайте «старый» релиз на лету. После успешного smoke можно вернуть
Git checkout к соответствующему release commit для согласованности runbook и кода.

Flyway migrations не откатываются автоматически. Для additive/backward-compatible
миграции обычно достаточно вернуть код. После destructive migration требуется
восстановление предварительного дампа с потерей данных, записанных после него. Такие
миграции выпускайте по expand/migrate/contract схеме в нескольких релизах.

После устранения инцидента верните checkout на защищённую ветку или release tag — не
оставляйте detached старый commit как незадокументированное состояние.

## Резервное копирование

Named volume защищает данные от пересоздания container, но не от удаления volume,
поломки диска, ошибки миграции или потери сервера.

Создайте отдельный каталог вне Git working tree:

```bash
(
  set -euo pipefail
  sudo install -d -m 0700 -o "$(id -un)" -g "$(id -gn)" /srv/exchangehub-backups
  backup_path="/srv/exchangehub-backups/exchangehub-$(date -u +%Y%m%dT%H%M%SZ).dump"
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
    'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner' \
    > "$backup_path"
  test -s "$backup_path"
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db \
    pg_restore --list < "$backup_path" >/dev/null
  sha256sum "$backup_path" > "$backup_path.sha256"
  chmod 600 "$backup_path" "$backup_path.sha256"
  printf 'Backup created and validated: %s\n' "$backup_path"
)
```

Subshell с `set -euo pipefail` не напечатает сообщение об успехе и не создаст checksum,
если `pg_dump`, проверка размера или `pg_restore --list` завершатся ошибкой.

Политика для небольшого проекта:

- backup перед каждым deploy с миграциями;
- daily backup;
- 7 daily, 4 weekly и 12 monthly копий;
- минимум одна encrypted copy вне VPS;
- alert, если последний успешный backup старше 26 часов;
- ежемесячный restore drill.

Daily logical backup даёт RPO до 24 часов. Для меньшего RPO используйте managed
PostgreSQL с continuous WAL archiving/PITR. Не удаляйте backup, пока off-host upload и
проверка checksum не завершились.

## Проверка восстановления

Проверяйте backup в отдельной временной базе того же PostgreSQL, не поверх production:

```bash
(
  set -euo pipefail
  restore_db=exchangehub_restore_check
  selected_backup=/srv/exchangehub-backups/SELECTED_BACKUP.dump
  test -s "$selected_backup"
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
    'dropdb --if-exists -U "$POSTGRES_USER" "$1" && \
     createdb -U "$POSTGRES_USER" --owner="$DB_APP_USER" "$1"' sh "$restore_db"

  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
    'pg_restore -U "$POSTGRES_USER" --role="$DB_APP_USER" -d "$1" \
      --no-owner --no-privileges --exit-on-error' \
    sh "$restore_db" < "$selected_backup"

  # Проверка выполняется именно application-role, а не superuser: так drill
  # обнаружит потерянные ownership/privileges до настоящей аварии.
  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
    'psql -v ON_ERROR_STOP=1 -U "$DB_APP_USER" -d "$1" -Atqc \
      "SELECT COUNT(*) FROM flyway_schema_history; SELECT COUNT(*) FROM users;"' \
    sh "$restore_db"
  owner_mismatch=$(docker compose --env-file .env.production -f docker-compose.prod.yml \
    exec -T db sh -ec 'psql -U "$DB_APP_USER" -d "$1" -Atqc \
      "SELECT COUNT(*) FROM pg_tables \
       WHERE schemaname = '\''public'\'' AND tableowner <> current_user;"' \
    sh "$restore_db")
  test "$owner_mismatch" = 0

  docker compose --env-file .env.production -f docker-compose.prod.yml exec -T db sh -ec \
    'dropdb -U "$POSTGRES_USER" "$1"' sh "$restore_db"
)
```

Перед настоящим disaster restore остановите backend, сохраните аварийный dump, явно
зафиксируйте целевой backup и допустимую потерю данных. Никогда не подменяйте
production DB импровизированной командой без второго подтверждения оператора.

## Логи и наблюдаемость

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs --since=30m backend
docker compose --env-file .env.production -f docker-compose.prod.yml logs --since=30m caddy
docker stats --no-stream
df -h
docker system df
```

Compose ограничивает JSON logs каждого service пятью файлами по 10 MB. Caddy пишет
структурированный access log в stdout; backend — application logs в stdout. Не
логируйте Authorization, refresh tokens, DB URLs с password или тела login-запросов.

Минимальные alerts:

- HTTPS недоступен или сертификат скоро истекает;
- backend readiness не `UP`;
- PostgreSQL volume заполнен более чем на 80%;
- host filesystem/RAM заполнены более чем на 80%;
- container постоянно перезапускается;
- backup старше 26 часов;
- рост HTTP 5xx/429 и ошибок Flyway.

## Ротация секретов

### JWT key

Замена `deploy/secrets/jwt_secret` инвалидирует все access tokens. Запланируйте окно,
замените secret атомарно и пересоздайте backend:

```bash
umask 077
openssl rand -base64 64 | tr -d '\n' > deploy/secrets/jwt_secret.next
chmod 0444 deploy/secrets/jwt_secret.next
mv deploy/secrets/jwt_secret.next deploy/secrets/jwt_secret
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --force-recreate --wait backend
```

Refresh tokens останутся в БД, поэтому клиенты смогут получить новые access tokens,
если refresh session ещё действительна. При компрометации отзовите refresh tokens в
БД или предусмотренным административным механизмом.

### Пароль приложения PostgreSQL

Простая замена secret-файла не меняет пароль существующей роли. Сначала измените
пароль роли через `psql`, затем атомарно замените `db_app_password` и пересоздайте
backend. Выполняйте операцию в короткое maintenance window и не передавайте пароль
через shell history. Для регулярной автоматической ротации используйте managed secret
manager.

## Типовые проблемы

### Caddy не получает сертификат

- DNS ещё указывает не на этот сервер;
- порт `80` или `443` закрыт firewall/security group;
- существует ошибочная `AAAA`-запись;
- другой процесс уже слушает порт;
- каталог `caddy_data` потерян или недоступен.

Проверка:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 caddy
```

### Backend unhealthy

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=300 backend
docker compose --env-file .env.production -f docker-compose.prod.yml exec -T backend \
  wget -qO- http://localhost:8080/actuator/health/readiness
```

Ищите ошибки доступа к DB, отсутствующий configtree secret, слишком короткий JWT key,
ошибку Flyway или Hibernate validation.

### PostgreSQL не запускается

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=300 db
docker compose --env-file .env.production -f docker-compose.prod.yml config --quiet
df -h
```

Init script не запускается повторно на существующем volume. Если переменные ролей
изменены после первого старта, примените изменения вручную; не удаляйте volume ради
повторного запуска init script.

### Миграция Flyway завершилась ошибкой

Не изменяйте уже применённый migration-файл и не редактируйте
`flyway_schema_history` вручную. Остановите rollout, сохраните logs и backup, исправьте
новой migration или восстановите backup по согласованному incident plan.

## Production checklist

- [ ] Deploy выполняется из проверенного commit, `git status` пуст.
- [ ] Используется `docker-compose.prod.yml`, а не local/demo Compose.
- [ ] `DOMAIN` указывает на сервер; наружу открыты только SSH, 80 и 443.
- [ ] DB и backend не публикуют host ports.
- [ ] `.env.production` имеет mode 600, каталог `deploy/secrets` — 700, файлы в нём — 0444; всё исключено из Git.
- [ ] Production secrets уникальны; local/demo defaults нигде не используются.
- [ ] `POSTGRES_ADMIN_USER` и `DB_APP_USER` различаются.
- [ ] Профиль строго `prod`, Swagger и demo data недоступны.
- [ ] Caddy выдаёт валидный HTTPS и security headers.
- [ ] Все services healthy, Flyway history соответствует release.
- [ ] Первый ADMIN создан, bootstrap secret-файлы обнулены.
- [ ] Backup создан, checksum проверен, off-host upload завершён.
- [ ] Restore drill выполнялся в течение последнего месяца.
- [ ] Настроены alerts на доступность, disk, restarts и возраст backup.
- [ ] Известен предыдущий рабочий release tag, и его backend/frontend images сохранены локально или в registry.

## Ссылки на первичную документацию

- [Docker Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)
- [Docker restart policies](https://docs.docker.com/engine/containers/start-containers-automatically/)
- [Caddy Automatic HTTPS](https://caddyserver.com/docs/automatic-https)
- [Spring Boot Actuator](https://docs.spring.io/spring-boot/reference/actuator/)
- [PostgreSQL `pg_dump`](https://www.postgresql.org/docs/current/app-pgdump.html)
- [GitHub deployment environments](https://docs.github.com/en/actions/concepts/workflows-and-actions/deployment-environments)
