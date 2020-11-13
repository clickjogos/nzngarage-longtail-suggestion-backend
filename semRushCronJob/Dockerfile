FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

COPY . .

# Bundle app source
RUN npm install

CMD [ "node", "runJob.js" ] 