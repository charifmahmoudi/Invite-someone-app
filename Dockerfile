FROM node:22.13-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY server ./server
COPY src ./src

EXPOSE 4000

CMD ["npm", "run", "server:start"]
