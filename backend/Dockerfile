# syntax=docker/dockerfile:1.7
# ── Build stage ────────────────────────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-21-alpine@sha256:65353f527c86cb23187c8233475713e15067e8d36220d18863c379680698fe85 AS build
WORKDIR /app

# Maven cache survives source changes and interrupted downloads.
COPY pom.xml .
COPY src ./src
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B package -DskipTests

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine@sha256:974b08960c5d96694c780e65b2d5705268ab1e1ca1a0dd0caf4ba6c3fe34d699
WORKDIR /app
RUN addgroup -S exchangehub && adduser -S -G exchangehub exchangehub
COPY --from=build --chown=exchangehub:exchangehub /app/target/*.jar app.jar
USER exchangehub
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
