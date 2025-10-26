import type { OrderFormData, OrderValidation } from "@/types/order";

/**
 * Validate order form data
 */
export const validateOrder = (
  formData: OrderFormData,
  bestBid: number,
  bestAsk: number
): OrderValidation => {
  const errors: string[] = [];

  // Validate price
  const price = parseFloat(formData.price);
  if (Number.isNaN(price) || price <= 0) {
    errors.push("Price must be a positive number");
  }

  // Validate quantity
  const quantity = parseFloat(formData.quantity);
  if (Number.isNaN(quantity) || quantity <= 0) {
    errors.push("Quantity must be a positive number");
  }

  // Validate post-only orders
  if (formData.postOnly) {
    if (formData.side === "BUY" && price >= bestAsk) {
      errors.push("Buy post-only orders must be below the best ask");
    }
    if (formData.side === "SELL" && price <= bestBid) {
      errors.push("Sell post-only orders must be above the best bid");
    }
  }

  // Validate minimum order size (example: 0.001 BTC)
  if (quantity < 0.001) {
    errors.push("Minimum order size is 0.001");
  }

  // Validate price precision (example: 2 decimal places)
  const priceStr = formData.price;
  const decimalIndex = priceStr.indexOf(".");
  if (decimalIndex !== -1 && priceStr.length - decimalIndex - 1 > 2) {
    errors.push("Price can have at most 2 decimal places");
  }

  // Validate quantity precision (example: 6 decimal places)
  const quantityStr = formData.quantity;
  const quantityDecimalIndex = quantityStr.indexOf(".");
  if (
    quantityDecimalIndex !== -1 &&
    quantityStr.length - quantityDecimalIndex - 1 > 6
  ) {
    errors.push("Quantity can have at most 6 decimal places");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
