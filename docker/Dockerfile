# Assumes that the program has already been built
FROM mhart/alpine-node:13
RUN apk add --no-cache bash coreutils grep sed python g++ make
WORKDIR /bot
COPY package.json .
COPY package-lock.json .
RUN npm install --only=production
COPY . .
RUN rm -rf src
# Start
ENV NODE_ENV prod
ENTRYPOINT [ "node", "./dist/src/index.js" ]
