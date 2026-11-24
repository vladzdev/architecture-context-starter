import test from 'node:test';
import assert from 'node:assert/strict';

import { createOrder, OrderValidationError } from '../src/orders/domain/order.mjs';
import { createPlaceOrder, InvalidOrderInputError } from '../src/orders/application/place-order.mjs';
import { InMemoryOrderRepository } from '../src/orders/infrastructure/in-memory-order-repository.mjs';
import { createOrderHandler } from '../src/orders/http/create-order-handler.mjs';

const validItems = [
  { sku: 'BOOK-1', quantity: 2, unitPriceCents: 1299 },
  { sku: 'PEN-2', quantity: 1, unitPriceCents: 250 },
];

test('createOrder calculates totals using integer cents and returns an immutable value', () => {
  const order = createOrder({
    id: 'order-1',
    items: validItems,
    createdAt: new Date('2026-11-20T10:00:00.000Z'),
  });

  assert.equal(order.totalCents, 2848);
  assert.equal(order.createdAt, '2026-11-20T10:00:00.000Z');
  assert.equal(Object.isFrozen(order), true);
  assert.equal(Object.isFrozen(order.items), true);
  assert.equal(Object.isFrozen(order.items[0]), true);
});

test('createOrder rejects empty orders and invalid quantities', () => {
  const base = { id: 'order-2', createdAt: new Date('2026-11-20T10:00:00.000Z') };

  assert.throws(() => createOrder({ ...base, items: [] }), OrderValidationError);
  assert.throws(
    () => createOrder({ ...base, items: [{ sku: 'BOOK-1', quantity: 0, unitPriceCents: 100 }] }),
    /quantity must be a positive safe integer/,
  );
});

test('createOrder rejects invalid SKUs and non-integer prices', () => {
  const createdAt = new Date('2026-11-20T10:00:00.000Z');

  assert.throws(
    () => createOrder({ id: 'order-sku', items: [{ sku: '  ', quantity: 1, unitPriceCents: 100 }], createdAt }),
    /non-empty SKU/,
  );
  assert.throws(
    () => createOrder({ id: 'order-price', items: [{ sku: 'BOOK-1', quantity: 1, unitPriceCents: 10.5 }], createdAt }),
    /non-negative safe integer/,
  );
});

test('createOrder rejects missing or coercible timestamps', () => {
  assert.throws(
    () => createOrder({ id: 'order-time', items: validItems, createdAt: null }),
    /Date or date string/,
  );
  assert.throws(
    () => createOrder({ id: 'order-time-2', items: validItems, createdAt: 0 }),
    /Date or date string/,
  );
});

test('createOrder rejects unsafe monetary arithmetic and invalid timestamps', () => {
  assert.throws(
    () => createOrder({
      id: 'order-3',
      items: [{ sku: 'BIG', quantity: 2, unitPriceCents: Number.MAX_SAFE_INTEGER }],
      createdAt: new Date(),
    }),
    /total exceeds the safe integer range/,
  );

  assert.throws(
    () => createOrder({ id: 'order-4', items: validItems, createdAt: 'not-a-date' }),
    /createdAt must be a valid date/,
  );
});

test('place-order use case saves the created order through an injected repository', async () => {
  const repository = new InMemoryOrderRepository();
  const placeOrder = createPlaceOrder({
    orderRepository: repository,
    idGenerator: () => 'order-5',
    clock: () => new Date('2026-11-20T10:00:00.000Z'),
  });

  const order = await placeOrder({ items: validItems });
  const saved = await repository.findById('order-5');

  assert.equal(order.totalCents, 2848);
  assert.deepEqual(saved, order);
});

test('place-order translates domain validation errors at the application boundary', async () => {
  const placeOrder = createPlaceOrder({
    orderRepository: new InMemoryOrderRepository(),
    idGenerator: () => 'order-6',
    clock: () => new Date('2026-11-20T10:00:00.000Z'),
  });

  await assert.rejects(() => placeOrder({ items: [] }), InvalidOrderInputError);
});

test('HTTP handler returns 201 for a valid request and 400 for invalid input', async () => {
  const repository = new InMemoryOrderRepository();
  let nextId = 0;
  const placeOrder = createPlaceOrder({
    orderRepository: repository,
    idGenerator: () => `http-order-${++nextId}`,
    clock: () => new Date('2026-11-20T10:00:00.000Z'),
  });
  const handler = createOrderHandler({ placeOrder });

  const success = await handler(new Request('http://localhost/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: validItems }),
  }));
  assert.equal(success.status, 201);
  assert.equal((await success.json()).data.totalCents, 2848);

  const invalid = await handler(new Request('http://localhost/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [] }),
  }));
  assert.equal(invalid.status, 400);
});

test('HTTP handler returns 400 for malformed JSON', async () => {
  const handler = createOrderHandler({ placeOrder: async () => assert.fail('must not call use case') });
  const response = await handler(new Request('http://localhost/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{',
  }));

  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /valid JSON/);
});
