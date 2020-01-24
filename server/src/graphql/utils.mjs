/**
 * See https://www.reindex.io/blog/relay-graphql-pagination-with-mongodb/
 */

 // TODO: write tests for these methods...

import mongodbModule from 'mongodb';

const { ObjectID } = mongodbModule;

export function parseCursor(cursorStr) {
  const [type, objectIdStr] = Buffer.from(cursorStr, 'base64').toString('utf8').split(':');
  const objectId = ObjectID.createFromHexString(objectIdStr);
  return { type, objectId };
}

export function formatCursor(type, objectId) {
  return Buffer.from(`${type}:${objectId.toHexString()}`).toString('base64');
}

export async function applyPagination(totalCount, query, first, last) {
  let resultCount = totalCount;

  if (first || last) {
    let limit;
    let skip;

    if (first && totalCount > first) {
      limit = first;
    }

    if (last) {
      if (limit && limit > last) {
        skip = limit - last;
        limit -= skip;
      } else if (!limit && totalCount > last) {
        skip = totalCount - last;
      }
    }

    if (skip) {
      console.log('skip()')
      query.skip(skip);
    }

    if (limit) {
      console.log('limit()')
      query.limit(limit);
    }

    resultCount = await query.clone().count();
  }

  let itemsPromise;
  async function getItems() {
    if (!itemsPromise) {
      itemsPromise = query.toArray();
    }

    return itemsPromise;
  }

  return {
    getItems,
    pageInfo: {
      hasNextPage: !!first && resultCount >= first,
      hasPreviousPage: !!last && resultCount >= last,
      async startCursor() {
        const items = await getItems();
        return items.length > 0 ? formatCursor('message', items[0]._id) : null;
      },
      async endCursor() {
        const items = await getItems();
        return items.length > 0 ? formatCursor('message', items[items.length - 1]._id) : null;
      },
    }
  };
}

/**
 * Optimized version of query() when ordering by _id
 */
export function querySortById(collection, before, after, direction) {
  const filter = {
  };

  if (before) {
    const { objectId } = parseCursor(before);
    const op = direction === 'ASC' ? '$lt' : '$gt';
    filter._id = {
      [op]: objectId,
    };
  }

  if (after) {
    const { objectId } = parseCursor(after);
    const op = direction === 'ASC' ? '$gt' : '$lt';
    filter._id = {
      [op]: objectId,
    };
  }

  return collection.find(filter).sort([['_id', direction === 'ASC' ? 1 : -1]]);
}

export async function querySortBy(collection, field, before, after, direction) {
  let filter = {};
  const limits = {};
  const ors = [];
  if (before) {
    const op = direction === 'ASC' ? '$lt' : '$gt';
    const beforeObject = await collection.findOne({
      _id: ObjectId(before.value),
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[op] = beforeObject[field];
    ors.push(
      {
        [field]: beforeObject[field],
        _id: { [op]: ObjectId(before.value) },
      },
    );
  }

  if (after) {
    const op = direction === 'ASC' ? '$gt' : '$lt';
    const afterObject = await collection.findOne({
      _id: ObjectId(after.value),
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[op] = afterObject[field];
    ors.push(
      {
        [field]: afterObject[field],
        _id: { [op]: ObjectId(after.value) },
      },
    );
  }

  if (before || after) {
    filter = {
      $or: [
        {
          [field]: limits,
        },
        ...ors,
      ],
    };
  }

  return collection.find(filter).sort([[field, direction === 'ASC' ? 1 : -1], ['_id', direction === 'ASC' ? 1 : -1]]);
}