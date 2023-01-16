FROM node:13-slim

ARG POSTIE_VERSION=1.0.0-alpha.3

RUN npm install @axah/postie-cli@$POSTIE_VERSION \
  && chmod ugo+w /node_modules/@axah/postie-web/build/index.html

ENTRYPOINT ["node", "./node_modules/.bin/postie"]
CMD ["start", "--in-memory"]

