/** In-memory adapter for the order repository contract used by the example. */
export class InMemoryOrderRepository {
  #orders = new Map();

  async save(order) {
    if (!order || typeof order.id !== 'string') {
      throw new TypeError('A valid order is required.');
    }

    if (this.#orders.has(order.id)) {
      throw new Error(`Order ${order.id} already exists.`);
    }

    this.#orders.set(order.id, structuredClone(order));
  }

  async findById(id) {
    const order = this.#orders.get(id);
    return order ? structuredClone(order) : null;
  }
}
