FROM node:14-buster as build

WORKDIR /nodeapp

COPY cli/package.json /nodeapp/cli/

COPY server/package.json /nodeapp/server/

COPY web/package.json /nodeapp/web/

COPY package.json yarn.lock /nodeapp/

RUN yarn install --frozen-lockfile

COPY . /nodeapp/

ENV NODE_ENV=PRODUCTION

# RUN npx browserslist@latest --update-db
RUN cd /nodeapp/web && yarn build \
  && cd /nodeapp && yarn install --production --frozen-lockfile \
  && chmod ugo+w /nodeapp/web/build/index.html

FROM node:14-buster-slim

ENV SSL_CERT_FILE="/etc/ssl/certs/ca-certificates.crt"
COPY ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

COPY --from=build /nodeapp .
ENTRYPOINT ["node", "--use-openssl-ca", "./node_modules/.bin/postie"]
CMD ["start", "--in-memory"]

