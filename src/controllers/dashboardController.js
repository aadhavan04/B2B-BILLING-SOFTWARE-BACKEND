import { Customer } from "../models/Customer.js";
import { Expense } from "../models/Expense.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { SalesInvoice } from "../models/SalesInvoice.js";
import { Supplier } from "../models/Supplier.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const sumBy = async (Model, owner, field, extraMatch = {}) => {
  const [result] = await Model.aggregate([
    { $match: { owner, ...extraMatch } },
    { $group: { _id: null, total: { $sum: `$${field}` } } },
  ]);
  return result?.total || 0;
};

export const getDashboard = asyncHandler(async (req, res) => {
  const owner = req.user._id;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [
    totalSales,
    todaySales,
    totalPurchases,
    totalExpenses,
    invoiceCount,
    productCount,
    customerCount,
    supplierCount,
    lowStockProducts,
    recentInvoices,
  ] = await Promise.all([
    sumBy(SalesInvoice, owner, "grandTotal", { status: { $ne: "cancelled" } }),
    sumBy(SalesInvoice, owner, "grandTotal", { invoiceDate: { $gte: startOfDay }, status: { $ne: "cancelled" } }),
    sumBy(Purchase, owner, "grandTotal", { status: { $ne: "cancelled" } }),
    sumBy(Expense, owner, "amount"),
    SalesInvoice.countDocuments({ owner }),
    Product.countDocuments({ owner, isActive: true }),
    Customer.countDocuments({ owner, isActive: true }),
    Supplier.countDocuments({ owner, isActive: true }),
    Product.find({ owner, $expr: { $lte: ["$stock", "$minStock"] } }).limit(10),
    SalesInvoice.find({ owner }).sort({ createdAt: -1 }).limit(5),
  ]);

  res.json({
    totals: {
      totalSales,
      todaySales,
      totalPurchases,
      totalExpenses,
      profitApprox: totalSales - totalPurchases - totalExpenses,
      invoiceCount,
      productCount,
      customerCount,
      supplierCount,
    },
    lowStockProducts,
    recentInvoices,
  });
});
