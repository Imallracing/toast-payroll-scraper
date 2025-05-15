FROM apify/actor-node-playwright:latest

COPY package*.json ./
RUN npm install
COPY . .

RUN npx playwright install --with-deps

CMD ["node", "main.js"]
