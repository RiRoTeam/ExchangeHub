# syntax=docker/dockerfile:1.7
FROM postgres:16-alpine@sha256:cf78e76683b9ca8c5733cbbdce6c9262b45b6767934dd0a95e671f9a0fc20685

# Keep the script non-executable so the official entrypoint sources it. Baking
# it into the image also avoids host bind-mount/noexec differences on Linux,
# Docker Desktop and hardened VPS filesystems.
COPY --chmod=0644 init/10-create-app-role.sh /docker-entrypoint-initdb.d/10-create-app-role.sh
