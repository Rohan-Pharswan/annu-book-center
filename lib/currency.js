const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

export function formatINR(amount) {
  const value = Number(amount);
  return inrFormatter.format(Number.isFinite(value) ? value : 0);
}
