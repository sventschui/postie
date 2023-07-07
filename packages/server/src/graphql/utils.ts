import type { FindCursor, Collection, WithId } from 'mongodb';
import { ObjectId } from 'mongodb';
import delve from 'dlv';
import type { Message, SortDirection } from '../messages/types';

export function parseCursor(cursorStr: string) {
  const [type, ObjectIdStr] = Buffer.from(cursorStr, 'base64').toString('utf8').split(':');
  const id = ObjectId.createFromHexString(ObjectIdStr);
  return { type, id };
}

export function formatCursor(type: string, objectId: ObjectId) {
  return Buffer.from(`${type}:${objectId.toHexString()}`).toString('base64');
}

export async function applyPagination(
  totalCount: number,
  query: FindCursor<WithId<Message>>,
  first: number,
  last: number,
) {
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

  let itemsPromise: Promise<ReadonlyArray<WithId<Message>>>;

  async function getItems(): Promise<ReadonlyArray<WithId<Message>>> {
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
    },
  };
}

/**
 * Optimized version of query() when ordering by _id
 */
export function querySortById(
  collection: Collection<Message>,
  inFilter: Record<any, any>,
  before: string,
  after: string,
  direction: SortDirection,
) {
  const filter = {
    ...inFilter,
  };

  if (before) {
    const { id } = parseCursor(before);
    const op = direction === 'ASC' ? '$lt' : '$gt';
    filter._id = {
      [op]: id,
    };
  }

  if (after) {
    const { id } = parseCursor(after);
    const op = direction === 'ASC' ? '$gt' : '$lt';
    filter._id = {
      [op]: id,
    };
  }

  return collection.find(filter).sort([['_id', direction === 'ASC' ? 1 : -1]]);
}

export async function querySortBy(
  collection: Collection<Message>,
  inFilter: Record<any, any>,
  field: string,
  before: string,
  after: string,
  direction: SortDirection,
) {
  let filter = { ...inFilter };
  const limits = {};
  const ors = [];
  if (before) {
    const { id } = parseCursor(before);
    const op = direction === 'ASC' ? '$lt' : '$gt';
    const beforeObject = (await collection.findOne(
      {
        _id: id,
      },
      {
        projection: {
          [field]: 1,
        },
      },
    )) as WithId<Message>;
    // @ts-ignore
    limits[op] = delve(beforeObject, field);
    ors.push({
      [field]: delve(beforeObject, field),
      _id: { [op]: id },
    });
  }

  if (after) {
    const { id } = parseCursor(after);
    const op = direction === 'ASC' ? '$gt' : '$lt';
    const afterObject = (await collection.findOne(
      {
        _id: id,
      },
      {
        projection: {
          [field]: 1,
        },
      },
    )) as WithId<Message>;
    // @ts-ignore
    limits[op] = delve(afterObject, field);
    ors.push({
      [field]: delve(afterObject, field),
      _id: { [op]: id },
    });
  }

  if (before || after) {
    filter = {
      ...inFilter,
      $or: [
        {
          [field]: limits,
        },
        ...ors,
      ],
    };
  }
  return collection.find(filter).sort([
    [field, direction === 'ASC' ? 1 : -1],
    ['_id', direction === 'ASC' ? 1 : -1],
  ]);
}
