import 'tests/test-helper';
import ActionQueue from 'orbit/action-queue';
import Evented from 'orbit/evented';
import { noop } from 'orbit/lib/stubs';
import { Promise } from 'rsvp';

///////////////////////////////////////////////////////////////////////////////

module('Orbit - ActionQueue', {});

test('it exists', function() {
  const queue = new ActionQueue(noop);
  ok(queue);
});

test('it is set to `autoProcess` by default', function() {
  const queue = new ActionQueue(noop);
  equal(queue.autoProcess, true, 'autoProcess === true');
});

test('will auto-process pushed actions sequentially by default', function(assert) {
  assert.expect(13);
  const done = assert.async();
  let order = 0;

  const queue = new ActionQueue();

  let op1 = { op: 'add', path: ['planets', '123'], value: 'Mercury' };
  let op2 = { op: 'add', path: ['planets', '234'], value: 'Venus' };
  let transformCount = 0;

  queue.on('beforeAction', function(action) {
    if (transformCount === 0) {
      assert.equal(order++, 0, 'op1 - order of beforeAction event');
      assert.deepEqual(action.data, op1, 'op1 - beforeAction - data correct');
    } else if (transformCount === 1) {
      assert.equal(order++, 3, 'op2 - order of beforeAction event');
      assert.deepEqual(action.data, op2, 'op2 - beforeAction - data correct');
    }
  });

  queue.on('action', function(action) {
    if (transformCount === 1) {
      assert.equal(order++, 2, 'op1 - order of action event');
      assert.deepEqual(action.data, op1, 'op1 processed');
    } else if (transformCount === 2) {
      assert.equal(order++, 5, 'op2 - order of action event');
      assert.deepEqual(action.data, op2, 'op2 processed');
    }
  });

  queue.on('complete', function() {
    assert.equal(order++, 6, 'order of complete event');
    done();
  });

  const _transform = function(op) {
    transformCount++;
    if (transformCount === 1) {
      assert.equal(order++, 1, '_transform - op1 - order');
      assert.deepEqual(op, op1, '_transform - op1 passed as argument');
    } else if (transformCount === 2) {
      assert.equal(order++, 4, '_transform - op2 - order');
      assert.deepEqual(op, op2, '_transform - op2 passed as argument');
    }
  };

  queue.push({
    id: 1,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op1
  });

  queue.push({
    id: 2,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op2
  });
});

test('with `autoProcess` disabled, will process pushed functions sequentially when `process` is called', function(assert) {
  assert.expect(5);
  const done = assert.async();

  const queue = new ActionQueue();

  let op1 = { op: 'add', path: ['planets', '123'], value: 'Mercury' };
  let op2 = { op: 'add', path: ['planets', '234'], value: 'Venus' };
  let transformCount = 0;

  queue.on('action', function(action) {
    if (transformCount === 1) {
      assert.deepEqual(action.data, op1, 'op1 processed');
    } else if (transformCount === 2) {
      assert.deepEqual(action.data, op2, 'op2 processed');
    }
  });

  queue.on('complete', function() {
    assert.ok(true, 'queue completed');
    done();
  });

  const _transform = function(op) {
    transformCount++;
    if (transformCount === 1) {
      assert.deepEqual(op, op1, 'op1 passed as argument');
    } else if (transformCount === 2) {
      assert.deepEqual(op, op2, 'op2 passed as argument');
    }
  };

  queue.push({
    id: 1,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op1
  });

  queue.push({
    id: 2,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op2
  });

  queue.process();
});

test('will auto-process pushed async functions sequentially by default', function(assert) {
  expect(8);
  const done = assert.async();

  const queue = new ActionQueue();

  let op1 = { op: 'add', path: ['planets', '123'], value: 'Mercury' };
  let op2 = { op: 'add', path: ['planets', '234'], value: 'Venus' };
  let order = 0;

  queue.on('action', function(action) {
    if (action.data === op1) {
      equal(++order, 3, 'op1 completed');
    } else if (action.data === op2) {
      equal(++order, 6, 'op2 completed');
    }
  });

  queue.on('complete', function() {
    equal(++order, 7, 'queue completed');
  });

  const trigger = {};
  Evented.extend(trigger);

  const _transform = function(op) {
    let promise;
    if (op === op1) {
      equal(++order, 1, '_transform with op1');
      promise = new Promise(function(resolve) {
        trigger.on('start1', function() {
          equal(++order, 2, '_transform with op1 resolved');
          resolve();
        });
      });
    } else if (op === op2) {
      equal(++order, 4, '_transform with op1');
      promise = new Promise(function(resolve) {
        equal(++order, 5, '_transform with op1 resolved');
        resolve();
      });
    }
    return promise;
  };

  queue.push({
    id: 1,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op1
  });

  queue.push({
    id: 2,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op2
  });

  queue.process()
    .then(function() {
      equal(++order, 8, 'queue resolves last');
      done();
    });

  trigger.emit('start1');
});

test('will stop processing when an action errors', function(assert) {
  assert.expect(5);

  const queue = new ActionQueue({ autoProcess: false });

  let op1 = { op: 'add', path: ['planets', '123'], value: 'Mercury' };
  let op2 = { op: 'add', path: ['planets', '234'], value: 'Venus' };
  let transformCount = 0;

  queue.on('action', function(action) {
    if (transformCount === 1) {
      assert.deepEqual(action.data, op1, 'action - op1 processed');
    } else if (transformCount === 2) {
      assert.ok(false, 'op2 could not be processed');
    }
  });

  queue.on('fail', function(action, err) {
    assert.deepEqual(action.data, op2, 'fail - op2 failed processing');
    assert.equal(err.message, ':(', 'fail - error matches expectation');
  });

  queue.on('complete', function() {
    assert.ok(false, 'queue should not complete');
  });

  const _transform = function(op) {
    transformCount++;
    if (transformCount === 1) {
      assert.deepEqual(op, op1, 'op1 passed as argument');
    } else if (transformCount === 2) {
      assert.deepEqual(op, op2, 'op2 passed as argument');
    }
  };

  queue.push({
    id: 1,
    process: function() {
      _transform.call(this, this.data);
    },
    data: op1
  });

  queue.push({
    id: 2,
    process: function() {
      throw new Error(':(');
    },
    data: op2
  });

  return queue.process()
    .catch(err => {
      assert.equal(err.message, ':(', 'process rejection - error matches expectation');
    });
});
