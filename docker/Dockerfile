FROM node:13

RUN npm install @postie_/cli

ENTRYPOINT ["node", "./node_modules/.bin/postie"]
CMD ["start", "--in-memory"]

