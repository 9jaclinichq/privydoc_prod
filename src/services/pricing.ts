export interface PricingDetails {
  priceFull: number;
  priceReview: number;
  payoutPct: number;
}

export const DEFAULT_PRICING_DETAILS: PricingDetails = {
  priceFull: 7500,
  priceReview: 3500,
  payoutPct: 70
};

export function calculatePayout(price: number, payoutPct: number = 70): number {
  return Math.round((price * payoutPct) / 100);
}

export function formatNaira(amount: number): string {
  return "₦" + amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
