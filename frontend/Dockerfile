# 開發模式 Dockerfile: 使用 vite dev server
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# 5173 是 Vite 的預設端口
EXPOSE 5173
# --host 確保在容器外部可訪問
CMD ["npm", "run", "dev", "--", "--host"]
