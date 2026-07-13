export function formatPrice(amountCents, currency = "USD") {
  const amount = typeof amountCents === "number" ? amountCents / 100 : 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
}
