export function usd(amount: number) {
  return `$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;
}

export const price = usd;

export function moneyLabel(amount: number, _currency?: string | null) {
  return `$${amount.toFixed(2)}`;
}
