FROM apify/actor-node-playwright:latest

COPY package*.json ./
RUN npm install

COPY . ./

CMD ["node", "main.js"]

