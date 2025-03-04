---
title: Updating data
---

Data in a source can be updated by applying a transform, which consists of one
or more operations. Transforms must be applied atomically—all operations
succeed or fail together.

## Operations

Operations each represent a single change to a record or relationship (e.g.
adding a record, updating a field, deleting a relationship, etc.).

The base [`Operation`](./api/data/interfaces/Operation.md) interface consists
of:

- `op` - a string identifying the type of operation
- `options` - (Optional) a [`RequestOptions`](./api/data/interfaces/RequestOptions.md) object

The other members of an [`Operation`](./api/data/interfaces/Operation.md) are
specific to the `op`. The following standard record-specific operations are
defined in [`@orbit/records`](./api/records/index.md):

```typescript
interface AddRecordOperation extends Operation {
  op: 'addRecord';
  record: InitializedRecord;
}

interface UpdateRecordOperation extends Operation {
  op: 'updateRecord';
  record: InitializedRecord;
}

interface RemoveRecordOperation extends Operation {
  op: 'removeRecord';
  record: RecordIdentity;
}

interface ReplaceKeyOperation extends Operation {
  op: 'replaceKey';
  record: RecordIdentity;
  key: string;
  value: string;
}

interface ReplaceAttributeOperation extends Operation {
  op: 'replaceAttribute';
  record: RecordIdentity;
  attribute: string;
  value: unknown;
}

interface AddToRelatedRecordsOperation extends Operation {
  op: 'addToRelatedRecords';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity;
}

interface RemoveFromRelatedRecordsOperation extends Operation {
  op: 'removeFromRelatedRecords';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity;
}

interface ReplaceRelatedRecordsOperation extends Operation {
  op: 'replaceRelatedRecords';
  record: RecordIdentity;
  relationship: string;
  relatedRecords: RecordIdentity[];
}

interface ReplaceRelatedRecordOperation extends Operation {
  op: 'replaceRelatedRecord';
  record: RecordIdentity;
  relationship: string;
  relatedRecord: RecordIdentity | null;
}
```

## Transforms

The [`Transform`](./api/data/interfaces/Transform.md) interface has the
following members:

- `id` - a string that uniquely identifies the transform
- `operations` - an instance or array of [`Operation`](./api/data/interfaces/Operation.md) objects
- `options` - an optional object that represents options that can influence how
  a transform is processed

Although transforms can be created "manually", you'll probably find it easier
to use a builder function that returns a transform.

To use a transform builder, pass a function into a source's method that expects
a transform, such as `update` or `push`. A `TranformBuilder` that's compatible
with the source should be applied as an argument. You can then use this builder
to create one or more operations.

For instance, here's how you might update a memory source with a single record:

```javascript
const earth = {
  type: 'planet',
  id: 'earth',
  attributes: {
    name: 'Earth'
  }
};

memory.update((t) => t.addRecord(earth));
```

To perform more than one operation in a single transform, just return an array
of operations:

```javascript
memory.update((t) => [t.addRecord(earth), t.addRecord(jupiter)]);
```

### Standard transforms

You can use the standard `@orbit/data` transform builder as follows:

```javascript
// Adding a new record
memory.update((t) =>
  t.addRecord({
    type: 'planet',
    id: 'earth',
    attributes: {
      name: 'Earth'
    }
  })
);

// Updating a record
memory.update((t) =>
  t.updateRecord({
    type: 'planet',
    id: 'earth',
    attributes: {
      name: 'Earth',
      classification: 'terrestrial',
      atmosphere: true
    }
  })
);

// Removing a record
memory.update((t) => t.removeRecord({ type: 'planet', id: 'earth' }));

// Replacing a key
memory.update((t) =>
  t.replaceKey({ type: 'planet', id: 'earth' }, 'remoteId', 'abc123')
);

// Replacing an attribute
memory.update((t) =>
  t.replaceAttribute(
    { type: 'planet', id: 'earth' },
    'classification',
    'gaseous'
  )
);

// Adding a member to a to-many relationship
memory.update((t) =>
  t.addToRelatedRecords({ type: 'planet', id: 'jupiter' }, 'moons', {
    type: 'moon',
    id: 'io'
  })
);

// Removing a member from a to-many relationship
memory.update((t) =>
  t.removeFromRelatedRecords({ type: 'planet', id: 'jupiter' }, 'moons', {
    type: 'moon',
    id: 'io'
  })
);

// Replacing every member of a to-many relationship
memory.update((t) =>
  t.replaceRelatedRecords({ type: 'planet', id: 'jupiter' }, 'moons', [
    { type: 'moon', id: 'io' },
    { type: 'moon', id: 'europa' }
  ])
);

// Replacing a to-one relationship
memory.update((t) =>
  t.replaceRelatedRecord({ type: 'planet', id: 'jupiter' }, 'solarSystem', {
    type: 'solarSystem',
    id: 'ourSolarSystem'
  })
);
```

### Transform options

Options can be added to transforms to provide processing instructions to
particular sources and to include metadata about transforms.

For example, the following transform is given a `label` and contains
instructions for the source named `remote`:

```javascript
memory.update(
  (t) =>
    t.updateRecord({
      type: 'planet',
      id: 'earth',
      attributes: {
        name: 'Earth',
        classification: 'terrestrial',
        atmosphere: true
      }
    }),
  {
    label: 'Update planet Earth',
    sources: {
      remote: {
        timeout: 100000
      }
    }
  }
);
```

A `label` can be useful for providing an understanding of actions that have been
queued for processing.

The `sources: { ${sourceName}: sourceSpecificOptions }` pattern is used to pass
options that only a particular source will understand when processing a
transform. In this instance, we're telling our remote source to use a custom
timeout when performing this particular update.

It is possible to pass different options to each operation in the transform.

```javascript
memory.update((t) => [
  t
    .addRecord({
      type: 'planet',
      attributes: {
        name: 'Earth'
      }
    })
    .options({ timeout: 1000 }),
  t
    .addRecord({
      type: 'planet',
      attributes: {
        name: 'Jupiter'
      }
    })
    .options({ timeout: 2000 })
]);
```
