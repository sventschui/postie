/**
 * See https://www.reindex.io/blog/relay-graphql-pagination-with-mongodb/
 */

 // TODO: write tests for these methods...

import mongodbModule from 'mongodb';
import delve from 'dlv';

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
      query.skip(skip);
    }

    if (limit) {
      query.limit(limit);
    }

    resultCount = await query.clone().count({});
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
      // TODO: hasNextPage only works when using first, hasPreviousPage only works when using last
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
export function querySortById(collection, inFilter, before, after, direction) {
  const filter = {
    ...inFilter,
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

export async function querySortBy(collection, inFilter, field, before, after, direction) {
  let filter = { ...inFilter };
  const limits = {};
  const ors = [];
  if (before) {
    const { objectId } = parseCursor(before);
    const ope = direction === 'ASC' ? '$lte' : '$gte';
    const op = direction === 'ASC' ? '$lt' : '$gt';
    const beforeObject = await collection.findOne({
      _id: objectId,
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[ope] = delve(beforeObject, field);
    ors.push(
      {
        [field]: delve(beforeObject, field),
        _id: { [op]: objectId },
      },
    );
  }

  if (after) {
    const { objectId } = parseCursor(after);
    const ope = direction === 'ASC' ? '$gte' : '$lte';
    const op = direction === 'ASC' ? '$gt' : '$lt';
    const afterObject = await collection.findOne({
      _id: objectId,
    }, {
      fields: {
        [field]: 1,
      },
    });
    limits[ope] = delve(afterObject, field);
    ors.push(
      {
        [field]: delve(afterObject, field),
        _id: { [op]: objectId },
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