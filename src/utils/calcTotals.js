export const calculateItems = (items) => {
  const normalized = items.map((item) => {
    const qty = Number(item.qty || 0);
    const rate = Number(item.rate || 0);
    const gstRate = Number(item.gstRate ?? 18);
    const taxableValue = qty * rate;
    const gstAmount = taxableValue * (gstRate / 100);
    const total = taxableValue + gstAmount;

    return {
      ...item,
      qty,
      rate,
      gstRate,
      taxableValue,
      gstAmount,
      total,
    };
  });

  const subtotal = normalized.reduce((sum, item) => sum + item.taxableValue, 0);
  const gstTotal = normalized.reduce((sum, item) => sum + item.gstAmount, 0);

  return { items: normalized, subtotal, gstTotal };
};

export const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
