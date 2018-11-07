FROM node:10

WORKDIR /app

COPY package*.json ./
RUN npm ci
COPY *.js ./

CMD echo Rnning Node.js `node --version` && node index.js --max-old-space-size=${OLD_SPACE:-50}
