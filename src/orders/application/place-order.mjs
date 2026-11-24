import { createOrder, OrderValidationError } from '../domain/order.mjs';

export class InvalidOrderInputError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = 'InvalidOrderInputError';
  }
}

/**
 * Build the place-order use case from dependencies supplied by the caller.
 * The application layer knows the repository contract, not its implementation.
 */
export function createPlaceOrder({ orderRepository, idGenerator, clock = () => new Date() }) {
  if (!orderRepository || typeof orderRepository.save !== 'function') {
    throw new TypeError('orderRepository.save must be provided.');
  }

  if (typeof idGenerator !== 'function') {
    throw new TypeError('idGenerator must be a function.');
  }

  if (typeof clock !== 'function') {
    throw new TypeError('clock must be a function.');
  }

  return async function placeOrder({ items }) {
    let order;

    try {
      order = createOrder({
        id: idGenerator(),
        items,
        createdAt: clock(),
      });
    } catch (error) {
      if (error instanceof OrderValidationError) {
        throw new InvalidOrderInputError(error.message, { cause: error });
      }
      throw error;
    }

    await orderRepository.save(order);
    return order;
  };
}
