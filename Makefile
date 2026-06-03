.PHONY: up down build logs ps restart clean nuke

## Поднять весь стек (сборка если нужно)
up:
	docker compose up -d --build

## Остановить контейнеры
down:
	docker compose down

## Пересобрать образы без кеша
build:
	docker compose build --no-cache

## Логи всех сервисов (follow)
logs:
	docker compose logs -f

## Логи конкретного сервиса: make logs-backend
logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

logs-db:
	docker compose logs -f db

## Статус контейнеров
ps:
	docker compose ps

## Перезапустить конкретный сервис: make restart s=backend
restart:
	docker compose restart $(s)

## Удалить контейнеры + volumes (сброс БД)
clean:
	docker compose down -v

## Полная очистка: контейнеры, volumes, образы проекта
nuke:
	docker compose down -v --rmi local
