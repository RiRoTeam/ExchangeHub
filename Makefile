.PHONY: up down build logs ps restart clean nuke demo demo-smoke demo-down demo-reset demo-clean

DEMO_PROJECT := exchangehub-demo

## Поднять весь стек (сборка если нужно)
up:
	docker compose up -d --build --wait

## Изолированный demo-стек с пользователями и наполненной БД
demo:
	SPRING_PROFILES_ACTIVE=demo DEMO_DATA_ENABLED=true docker compose -p $(DEMO_PROJECT) up -d --build --wait
	@echo "ExchangeHub demo: http://localhost:3000"
	@echo "Swagger UI:      http://localhost:8080/swagger-ui.html"

## Быстрый smoke-тест запущенного demo-стека
demo-smoke:
	@curl --fail --silent --show-error http://localhost:3000/ >/dev/null
	@curl --fail --silent --show-error 'http://localhost:3000/api/programs?size=100' | grep -Eq '"content":\[\{'
	@curl --fail --silent --show-error http://localhost:8080/v3/api-docs | grep -q '"openapi"'
	@curl --fail --silent --show-error http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"student@demo.exchangehub.local","password":"DemoUser123!"}' | grep -q '"accessToken"'
	@admin_token=$$(curl --fail --silent --show-error http://localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@demo.exchangehub.local","password":"DemoAdmin123!"}' | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p'); test -n "$$admin_token"; curl --fail --silent --show-error http://localhost:3000/api/admin/users -H "Authorization: Bearer $$admin_token" >/dev/null
	@echo "Demo smoke test passed"

## Остановить и удалить только demo-контейнеры (данные сохраняются в volume)
demo-down:
	docker compose -p $(DEMO_PROJECT) down --remove-orphans

## Удалить demo БД и сразу поднять заново с чистым детерминированным seed
demo-reset:
	docker compose -p $(DEMO_PROJECT) down -v --remove-orphans
	$(MAKE) demo

## Полностью удалить demo-контейнеры и demo-volume
demo-clean:
	docker compose -p $(DEMO_PROJECT) down -v --remove-orphans

## Остановить контейнеры
down:
	docker compose down --remove-orphans

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
	docker compose down -v --remove-orphans

## Полная очистка: контейнеры, volumes, образы проекта
nuke:
	docker compose down -v --rmi local --remove-orphans
