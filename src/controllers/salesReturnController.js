import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Customer } from "../models/Customer.js";
import { Product } from "../models/Product.js";
import { SalesInvoice } from "../models/SalesInvoice.js";
import { SalesReturn } from "../models/SalesReturn.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateItems, roundMoney } from "../utils/calcTotals.js";

const nextReturnNo = async (owner) => {
  const count = await SalesReturn.countDocuments({ owner });
  return `SR-${String(count + 1).padStart(5, "0")}`;
};

const normalizeEditableItems = (items) =>
  items.map((item) => {
    const plainItem = typeof item.toObject === "function" ? item.toObject() : item;
    return {
      ...plainItem,
      rate: plainItem.rate ?? plainItem.price ?? 0,
    };
  });

const buildCustomerSnapshot = (invoice, customer) => ({
  name: customer?.name || invoice.customerSnapshot?.name || "Walk-in Customer",
  phone: customer?.phone || invoice.customerSnapshot?.phone,
  email: customer?.email || invoice.customerSnapshot?.email,
  gstNumber: customer?.gstNumber || invoice.customerSnapshot?.gstNumber,
  address: customer?.billingAddress || invoice.customerSnapshot?.address,
});

const adjustSalesReturnStock = async (owner, oldItems = [], newItems = []) => {
  const productQty = new Map();

  oldItems
    .filter((item) => item.product)
    .forEach((item) => {
      const productId = item.product.toString();
      productQty.set(productId, (productQty.get(productId) || 0) - Number(item.qty || 0));
    });

  newItems
    .filter((item) => item.product)
    .forEach((item) => {
      const productId = item.product.toString();
      productQty.set(productId, (productQty.get(productId) || 0) + Number(item.qty || 0));
    });

  await Promise.all(
    Array.from(productQty.entries())
      .filter(([, qty]) => qty !== 0)
      .map(([productId, qty]) =>
        Product.updateOne({ _id: productId, owner }, { $inc: { stock: qty } })
      )
  );
};

export const listSalesReturns = asyncHandler(async (req, res) => {
  const returns = await SalesReturn.find({ owner: req.user._id })
    .populate("customer", "name phone email gstNumber billingAddress")
    .populate("saleInvoice", "invoiceNo invoiceDate customerSnapshot grandTotal")
    .sort({ returnDate: -1, createdAt: -1 });

  res.json(returns);
});

export const getSalesReturn = asyncHandler(async (req, res) => {
  const salesReturn = await SalesReturn.findOne({
    _id: req.params.id,
    owner: req.user._id,
  })
    .populate("customer", "name phone email gstNumber billingAddress")
    .populate("saleInvoice", "invoiceNo invoiceDate customerSnapshot grandTotal");

  if (!salesReturn) {
    res.status(404);
    throw new Error("Sales return not found");
  }

  res.json(salesReturn);
});

export const createSalesReturn = asyncHandler(async (req, res) => {
  const {
    saleInvoice,
    saleInvoiceId,
    salesInvoice,
    items = [],
    discount = 0,
    reason = "",
    notes = "",
  } = req.body;

  const selectedInvoiceId = saleInvoice || saleInvoiceId || salesInvoice;
  if (!selectedInvoiceId || !mongoose.isValidObjectId(selectedInvoiceId)) {
    res.status(400);
    throw new Error("Sale invoice is required");
  }

  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const invoice = await SalesInvoice.findOne({
    _id: selectedInvoiceId,
    owner: req.user._id,
  });

  if (!invoice) {
    res.status(404);
    throw new Error("Sales invoice not found");
  }

  const [company, customer] = await Promise.all([
    Company.findOne({ owner: req.user._id }),
    invoice.customer ? Customer.findOne({ _id: invoice.customer, owner: req.user._id }) : null,
  ]);

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(
    normalizeEditableItems(items)
  );
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  const salesReturn = await SalesReturn.create({
    owner: req.user._id,
    saleInvoice: invoice._id,
    returnNo: req.body.returnNo || (await nextReturnNo(req.user._id)),
    returnDate: req.body.returnDate || new Date(),
    customer: customer?._id || invoice.customer,
    customerSnapshot: buildCustomerSnapshot(invoice, customer),
    companySnapshot: company ? company.toObject() : invoice.companySnapshot || {},
    items: calculatedItems,
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    gstTotal: roundMoney(gstTotal),
    grandTotal,
    reason,
    notes,
  });

  await adjustSalesReturnStock(req.user._id, [], calculatedItems);

  res.status(201).json(salesReturn);
});

export const updateSalesReturn = asyncHandler(async (req, res) => {
  const salesReturn = await SalesReturn.findOne({ _id: req.params.id, owner: req.user._id });
  if (!salesReturn) {
    res.status(404);
    throw new Error("Sales return not found");
  }

  if (
    Object.hasOwn(req.body, "saleInvoice") ||
    Object.hasOwn(req.body, "saleInvoiceId") ||
    Object.hasOwn(req.body, "salesInvoice")
  ) {
    const selectedInvoiceId = req.body.saleInvoice || req.body.saleInvoiceId || req.body.salesInvoice;
    if (!selectedInvoiceId || !mongoose.isValidObjectId(selectedInvoiceId)) {
      res.status(400);
      throw new Error("Sale invoice is required");
    }

    const invoice = await SalesInvoice.findOne({
      _id: selectedInvoiceId,
      owner: req.user._id,
    });

    if (!invoice) {
      res.status(404);
      throw new Error("Sales invoice not found");
    }

    const customer = invoice.customer
      ? await Customer.findOne({ _id: invoice.customer, owner: req.user._id })
      : null;
    salesReturn.saleInvoice = invoice._id;
    salesReturn.customer = customer?._id || invoice.customer;
    salesReturn.customerSnapshot = buildCustomerSnapshot(invoice, customer);
    salesReturn.companySnapshot = salesReturn.companySnapshot || invoice.companySnapshot || {};
  }

  const items = normalizeEditableItems(req.body.items ?? salesReturn.items);
  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const discount = req.body.discount ?? salesReturn.discount;
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  await adjustSalesReturnStock(req.user._id, salesReturn.items, calculatedItems);

  salesReturn.returnNo = req.body.returnNo ?? salesReturn.returnNo;
  salesReturn.returnDate = req.body.returnDate ?? salesReturn.returnDate;
  salesReturn.items = calculatedItems;
  salesReturn.subtotal = roundMoney(subtotal);
  salesReturn.discount = roundMoney(discount);
  salesReturn.gstTotal = roundMoney(gstTotal);
  salesReturn.grandTotal = grandTotal;
  salesReturn.reason = req.body.reason ?? salesReturn.reason;
  salesReturn.notes = req.body.notes ?? salesReturn.notes;

  await salesReturn.save();
  res.json(salesReturn);
});

export const deleteSalesReturn = asyncHandler(async (req, res) => {
  const salesReturn = await SalesReturn.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!salesReturn) {
    res.status(404);
    throw new Error("Sales return not found");
  }

  await adjustSalesReturnStock(req.user._id, salesReturn.items, []);
  res.json({ message: "Sales return deleted" });
});
