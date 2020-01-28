FROM node:13-slim

ARG POSTIE_VERSION=1.0.0-alpha.3

RUN npm install @postie_/cli@$POSTIE_VERSION

ENTRYPOINT ["node", "./node_modules/.bin/postie"]
CMD ["start", "--in-memory"]

