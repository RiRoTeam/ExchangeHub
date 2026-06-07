# ── Build stage ────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Копируем pom.xml отдельно, чтобы Docker мог кешировать слой зависимостей
COPY pom.xml .
RUN mvn dependency:go-offline -q

COPY src ./src

# Прямая сборка надёжнее, чем dependency:go-offline, который часто падает
# на резолве plugin dependencies внутри контейнера.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B package -DskipTests

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
