import { Company } from "../models/Company.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { SalesInvoice } from "../models/SalesInvoice.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateItems, roundMoney } from "../utils/calcTotals.js";
import mongoose from "mongoose";

const nextInvoiceNo = async (owner) => {
  const count = await SalesInvoice.countDocuments({ owner });
  return `INV-${String(count + 1).padStart(5, "0")}`;
};

const getSelectedCustomerId = ({ customerId, customer }) => {
  if (typeof customerId === "string") return customerId;
  if (customerId?._id) return customerId._id;
  if (customerId?.id) return customerId.id;
  if (customerId?.value) return customerId.value;
  if (typeof customer === "string") return customer;
  if (customer?._id) return customer._id;
  if (customer?.id) return customer.id;
  if (customer?.value) return customer.value;
  return null;
};

const getCustomerFallback = (customer) =>
  customer && typeof customer === "object" ? customer : {};

const getCustomerAddress = (dbCustomer, customer) =>
  dbCustomer?.billingAddress || customer?.billingAddress || customer?.address;

const buildCustomerSnapshot = (dbCustomer, customerFallback = {}) => ({
  name: dbCustomer?.name || customerFallback.name || customerFallback.label || "Walk-in Customer",
  phone: dbCustomer?.phone || customerFallback.phone,
  email: dbCustomer?.email || customerFallback.email,
  gstNumber: dbCustomer?.gstNumber || customerFallback.gstNumber,
  address: getCustomerAddress(dbCustomer, customerFallback),
});

const adjustSalesStock = async (owner, oldItems = [], newItems = []) => {
  const productQty = new Map();

  oldItems
    .filter((item) => item.product)
    .forEach((item) => {
      const productId = item.product.toString();
      productQty.set(productId, (productQty.get(productId) || 0) + Number(item.qty || 0));
    });

  newItems
    .filter((item) => item.product)
    .forEach((item) => {
      const productId = item.product.toString();
      productQty.set(productId, (productQty.get(productId) || 0) - Number(item.qty || 0));
    });

  await Promise.all(
    Array.from(productQty.entries())
      .filter(([, qty]) => qty !== 0)
      .map(([productId, qty]) =>
        Product.updateOne(
          { _id: productId, owner },
          { $inc: { stock: qty } }
        )
      )
  );
};

const normalizeEditableItems = (items) =>
  items.map((item) => (typeof item.toObject === "function" ? item.toObject() : item));

export const listSales = asyncHandler(async (req, res) => {
  const invoices = await SalesInvoice.find({ owner: req.user._id })
    .populate("customer", "name phone email gstNumber billingAddress")
    .sort({ invoiceDate: -1, createdAt: -1 });
  res.json(invoices);
});

export const getSale = asyncHandler(async (req, res) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("customer", "name phone email gstNumber billingAddress");
  if (!invoice) {
    res.status(404);
    throw new Error("Sales invoice not found");
  }
  res.json(invoice);
});

export const createSale = asyncHandler(async (req, res) => {
  const { customerId, customer, items = [], discount = 0, paidAmount = 0 } = req.body;

  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const selectedCustomerId = getSelectedCustomerId({ customerId, customer });
  const customerFallback = getCustomerFallback(customer);
  if (selectedCustomerId && !mongoose.isValidObjectId(selectedCustomerId)) {
    res.status(400);
    throw new Error("Selected customer not found");
  }

  const dbCustomer = selectedCustomerId
    ? await Customer.findOne({ _id: selectedCustomerId, owner: req.user._id })
    : null;

  if (selectedCustomerId && !dbCustomer) {
    res.status(400);
    throw new Error("Selected customer not found");
  }

  const company = await Company.findOne({ owner: req.user._id });
  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));
  const balanceAmount = roundMoney(grandTotal - Number(paidAmount || 0));

  const invoice = await SalesInvoice.create({
    owner: req.user._id,
    invoiceNo: req.body.invoiceNo || (await nextInvoiceNo(req.user._id)),
    invoiceDate: req.body.invoiceDate || new Date(),
    dueDate: req.body.dueDate,
    customer: dbCustomer?._id,
    customerSnapshot: buildCustomerSnapshot(dbCustomer, customerFallback),
    companySnapshot: company ? company.toObject() : {},
    items: calculatedItems,
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    gstTotal: roundMoney(gstTotal),
    grandTotal,
    paidAmount: roundMoney(paidAmount),
    balanceAmount,
    status: balanceAmount <= 0 ? "paid" : Number(paidAmount) > 0 ? "partial" : "unpaid",
    notes: req.body.notes,
  });

  await Promise.all(
    calculatedItems
      .filter((item) => item.product)
      .map((item) =>
        Product.updateOne(
          { _id: item.product, owner: req.user._id },
          { $inc: { stock: -Number(item.qty) } }
        )
      )
  );

  res.status(201).json(invoice);
});

export const updateSale = asyncHandler(async (req, res) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, owner: req.user._id });
  if (!invoice) {
    res.status(404);
    throw new Error("Sales invoice not found");
  }

  const items = normalizeEditableItems(req.body.items ?? invoice.items);
  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const hasCustomerChange = Object.hasOwn(req.body, "customerId") || Object.hasOwn(req.body, "customer");
  if (hasCustomerChange) {
    const { customerId, customer } = req.body;
    const selectedCustomerId = getSelectedCustomerId({ customerId, customer });
    const customerFallback = getCustomerFallback(customer);
    if (selectedCustomerId && !mongoose.isValidObjectId(selectedCustomerId)) {
      res.status(400);
      throw new Error("Selected customer not found");
    }

    const dbCustomer = selectedCustomerId
      ? await Customer.findOne({ _id: selectedCustomerId, owner: req.user._id })
      : null;

    if (selectedCustomerId && !dbCustomer) {
      res.status(400);
      throw new Error("Selected customer not found");
    }

    invoice.customer = dbCustomer?._id;
    invoice.customerSnapshot = buildCustomerSnapshot(dbCustomer, customerFallback);
  }

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const discount = req.body.discount ?? invoice.discount;
  const paidAmount = req.body.paidAmount ?? invoice.paidAmount;
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));
  const balanceAmount = roundMoney(grandTotal - Number(paidAmount || 0));

  await adjustSalesStock(req.user._id, invoice.items, calculatedItems);

  invoice.invoiceNo = req.body.invoiceNo ?? invoice.invoiceNo;
  invoice.invoiceDate = req.body.invoiceDate ?? invoice.invoiceDate;
  invoice.dueDate = req.body.dueDate ?? invoice.dueDate;
  invoice.items = calculatedItems;
  invoice.subtotal = roundMoney(subtotal);
  invoice.discount = roundMoney(discount);
  invoice.gstTotal = roundMoney(gstTotal);
  invoice.grandTotal = grandTotal;
  invoice.paidAmount = roundMoney(paidAmount);
  invoice.balanceAmount = balanceAmount;
  invoice.status = req.body.status || (balanceAmount <= 0 ? "paid" : Number(paidAmount) > 0 ? "partial" : "unpaid");
  invoice.notes = req.body.notes ?? invoice.notes;

  await invoice.save();
  res.json(invoice);
});

export const updateSaleStatus = asyncHandler(async (req, res) => {
  const invoice = await SalesInvoice.findOne({ _id: req.params.id, owner: req.user._id });
  if (!invoice) {
    res.status(404);
    throw new Error("Sales invoice not found");
  }

  invoice.paidAmount = roundMoney(req.body.paidAmount ?? invoice.paidAmount);
  invoice.balanceAmount = roundMoney(invoice.grandTotal - invoice.paidAmount);
  invoice.status = req.body.status || (invoice.balanceAmount <= 0 ? "paid" : invoice.paidAmount > 0 ? "partial" : "unpaid");
  await invoice.save();
  res.json(invoice);
});

export const deleteSale = asyncHandler(async (req, res) => {
  const invoice = await SalesInvoice.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!invoice) {
    res.status(404);
    throw new Error("Sales invoice not found");
  }
  res.json({ message: "Sales invoice deleted" });
});
