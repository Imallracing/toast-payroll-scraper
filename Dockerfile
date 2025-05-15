FROM apify/actor-node-playwright:latest

COPY package*.json ./
RUN npm install

COPY . ./

# This is the correct line — no `--with-deps` needed!
RUN npx playwright install

CMD ["node", "main.js"]
