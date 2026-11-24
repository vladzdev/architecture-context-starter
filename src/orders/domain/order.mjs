export class OrderValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OrderValidationError';
  }
}

/**
 * Create an immutable order after validating its domain invariants.
 * Prices are integer cents; floating-point currency values are not accepted.
 */
export function createOrder({ id, items, createdAt }) {
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new OrderValidationError('Order id must be a non-empty string.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderValidationError('An order must contain at least one item.');
  }

  const normalizedItems = items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new OrderValidationError(`Item ${index + 1} must be an object.`);
    }

    if (typeof item.sku !== 'string' || item.sku.trim().length === 0) {
      throw new OrderValidationError(`Item ${index + 1} must have a non-empty SKU.`);
    }

    if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new OrderValidationError(`Item ${index + 1} quantity must be a positive safe integer.`);
    }

    if (!Number.isSafeInteger(item.unitPriceCents) || item.unitPriceCents < 0) {
      throw new OrderValidationError(`Item ${index + 1} unitPriceCents must be a non-negative safe integer.`);
    }

    const lineTotalCents = item.quantity * item.unitPriceCents;
    if (!Number.isSafeInteger(lineTotalCents)) {
      throw new OrderValidationError(`Item ${index + 1} total exceeds the safe integer range.`);
    }

    return Object.freeze({
      sku: item.sku.trim(),
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
      lineTotalCents,
    });
  });

  const totalCents = normalizedItems.reduce((total, item) => total + item.lineTotalCents, 0);
  if (!Number.isSafeInteger(totalCents)) {
    throw new OrderValidationError('Order total exceeds the safe integer range.');
  }

  if (!(createdAt instanceof Date) && typeof createdAt !== 'string') {
    throw new OrderValidationError('createdAt must be a Date or date string.');
  }

  const timestamp = createdAt instanceof Date ? new Date(createdAt.getTime()) : new Date(createdAt);
  if (!Number.isFinite(timestamp.getTime())) {
    throw new OrderValidationError('createdAt must be a valid date.');
  }

  return Object.freeze({
    id: id.trim(),
    items: Object.freeze(normalizedItems),
    totalCents,
    createdAt: timestamp.toISOString(),
  });
}
