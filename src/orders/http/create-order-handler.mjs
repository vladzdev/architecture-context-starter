import { InvalidOrderInputError } from '../application/place-order.mjs';

/** Create a Web API-compatible handler without coupling the use case to HTTP. */
export function createOrderHandler({ placeOrder }) {
  if (typeof placeOrder !== 'function') {
    throw new TypeError('placeOrder must be a function.');
  }

  return async function handleCreateOrder(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    try {
      const order = await placeOrder({ items: body?.items });
      return Response.json({ data: order }, { status: 201 });
    } catch (error) {
      if (error instanceof InvalidOrderInputError) {
        return Response.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }
  };
}
