export type AddResult = { ok: true } | { ok: false; error: string; needsLogin?: boolean };

/** Calls the server cart API. The server looks up the real price - we only send which item and how many. */
export async function addToCartRequest(body: { foodItemId?: string; groceryProductId?: string; quantity?: number }): Promise<AddResult> {
  try {
    const res = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: 1, ...body }),
    });
    if (res.status === 401) return { ok: false, error: "Please log in to add items.", needsLogin: true };
    if (res.status === 403) return { ok: false, error: "Only customer accounts can place orders. Please log in with a customer account." };
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Unable to add to cart. Please try again." };
    return { ok: true };
  } catch {
    return { ok: false, error: "Unable to add to cart. Please try again." };
  }
}
