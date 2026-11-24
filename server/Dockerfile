FROM node:24-alpine
WORKDIR /app
COPY server.mjs ./
RUN mkdir -p /data && chown node:node /data
USER node
ENV PORT=8080 DB=/data/pw.db NODE_NO_WARNINGS=1
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1
CMD ["node", "server.mjs"]
