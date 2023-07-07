ARG POSTIE_VERSION=2.0.0
ARG IMAGE_PREFIX=axahealth
FROM $IMAGE_PREFIX/node-build:18.16.1-0 as build

ENV NODE_ENV=PRODUCTION

RUN npm install @axah/postie-cli@$POSTIE_VERSION \
  && chmod ugo+w ./node_modules/@axah/postie-web/build/index.html

COPY . /nodeapp/

FROM $IMAGE_PREFIX/node-run:18.16.1-0

COPY --from=build /nodeapp .

ENTRYPOINT ["/nodejs/bin/node", "./node_modules/.bin/postie"]
CMD ["start", "--in-memory"]

