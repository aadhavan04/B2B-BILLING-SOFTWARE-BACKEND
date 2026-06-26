import mongoose from "mongoose";
import { Company } from "../models/Company.js";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { PurchaseReturn } from "../models/PurchaseReturn.js";
import { Supplier } from "../models/Supplier.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateItems, roundMoney } from "../utils/calcTotals.js";

const nextReturnNo = async (owner) => {
  const count = await PurchaseReturn.countDocuments({ owner });
  return `PR-${String(count + 1).padStart(5, "0")}`;
};

const normalizeEditableItems = (items) =>
  items.map((item) => (typeof item.toObject === "function" ? item.toObject() : item));

const buildSupplierSnapshot = (purchase, supplier) => ({
  name: supplier?.name || purchase.supplierSnapshot?.name || "Unknown Supplier",
  phone: supplier?.phone || purchase.supplierSnapshot?.phone,
  email: supplier?.email || purchase.supplierSnapshot?.email,
  gstNumber: supplier?.gstNumber || purchase.supplierSnapshot?.gstNumber,
  address: supplier?.address || purchase.supplierSnapshot?.address,
});

const adjustPurchaseReturnStock = async (owner, oldItems = [], newItems = []) => {
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
        Product.updateOne({ _id: productId, owner }, { $inc: { stock: qty } })
      )
  );
};

export const listPurchaseReturns = asyncHandler(async (req, res) => {
  const returns = await PurchaseReturn.find({ owner: req.user._id })
    .populate("supplier", "name phone email gstNumber address")
    .populate("purchase", "purchaseNo purchaseDate supplierSnapshot grandTotal")
    .sort({ returnDate: -1, createdAt: -1 });

  res.json(returns);
});

export const getPurchaseReturn = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseReturn.findOne({
    _id: req.params.id,
    owner: req.user._id,
  })
    .populate("supplier", "name phone email gstNumber address")
    .populate("purchase", "purchaseNo purchaseDate supplierSnapshot grandTotal");

  if (!purchaseReturn) {
    res.status(404);
    throw new Error("Purchase return not found");
  }

  res.json(purchaseReturn);
});

export const createPurchaseReturn = asyncHandler(async (req, res) => {
  const {
    purchase,
    purchaseId,
    items = [],
    discount = 0,
    reason = "",
    notes = "",
  } = req.body;

  const selectedPurchaseId = purchase || purchaseId;
  if (!selectedPurchaseId || !mongoose.isValidObjectId(selectedPurchaseId)) {
    res.status(400);
    throw new Error("Purchase is required");
  }

  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const purchaseDoc = await Purchase.findOne({
    _id: selectedPurchaseId,
    owner: req.user._id,
  });

  if (!purchaseDoc) {
    res.status(404);
    throw new Error("Purchase not found");
  }

  const [company, supplier] = await Promise.all([
    Company.findOne({ owner: req.user._id }),
    purchaseDoc.supplier ? Supplier.findOne({ _id: purchaseDoc.supplier, owner: req.user._id }) : null,
  ]);

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(
    normalizeEditableItems(items)
  );
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  const purchaseReturn = await PurchaseReturn.create({
    owner: req.user._id,
    purchase: purchaseDoc._id,
    returnNo: req.body.returnNo || (await nextReturnNo(req.user._id)),
    returnDate: req.body.returnDate || new Date(),
    supplier: supplier?._id || purchaseDoc.supplier,
    supplierSnapshot: buildSupplierSnapshot(purchaseDoc, supplier),
    companySnapshot: company ? company.toObject() : purchaseDoc.companySnapshot || {},
    items: calculatedItems,
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    gstTotal: roundMoney(gstTotal),
    grandTotal,
    reason,
    notes,
  });

  await adjustPurchaseReturnStock(req.user._id, [], calculatedItems);

  res.status(201).json(purchaseReturn);
});

export const updatePurchaseReturn = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseReturn.findOne({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!purchaseReturn) {
    res.status(404);
    throw new Error("Purchase return not found");
  }

  if (Object.hasOwn(req.body, "purchase") || Object.hasOwn(req.body, "purchaseId")) {
    const selectedPurchaseId = req.body.purchase || req.body.purchaseId;
    if (!selectedPurchaseId || !mongoose.isValidObjectId(selectedPurchaseId)) {
      res.status(400);
      throw new Error("Purchase is required");
    }

    const purchaseDoc = await Purchase.findOne({
      _id: selectedPurchaseId,
      owner: req.user._id,
    });

    if (!purchaseDoc) {
      res.status(404);
      throw new Error("Purchase not found");
    }

    const supplier = purchaseDoc.supplier
      ? await Supplier.findOne({ _id: purchaseDoc.supplier, owner: req.user._id })
      : null;
    purchaseReturn.purchase = purchaseDoc._id;
    purchaseReturn.supplier = supplier?._id || purchaseDoc.supplier;
    purchaseReturn.supplierSnapshot = buildSupplierSnapshot(purchaseDoc, supplier);
    purchaseReturn.companySnapshot = purchaseReturn.companySnapshot || purchaseDoc.companySnapshot || {};
  }

  const items = normalizeEditableItems(req.body.items ?? purchaseReturn.items);
  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const discount = req.body.discount ?? purchaseReturn.discount;
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  await adjustPurchaseReturnStock(req.user._id, purchaseReturn.items, calculatedItems);

  purchaseReturn.returnNo = req.body.returnNo ?? purchaseReturn.returnNo;
  purchaseReturn.returnDate = req.body.returnDate ?? purchaseReturn.returnDate;
  purchaseReturn.items = calculatedItems;
  purchaseReturn.subtotal = roundMoney(subtotal);
  purchaseReturn.discount = roundMoney(discount);
  purchaseReturn.gstTotal = roundMoney(gstTotal);
  purchaseReturn.grandTotal = grandTotal;
  purchaseReturn.reason = req.body.reason ?? purchaseReturn.reason;
  purchaseReturn.notes = req.body.notes ?? purchaseReturn.notes;

  await purchaseReturn.save();
  res.json(purchaseReturn);
});

export const deletePurchaseReturn = asyncHandler(async (req, res) => {
  const purchaseReturn = await PurchaseReturn.findOneAndDelete({
    _id: req.params.id,
    owner: req.user._id,
  });

  if (!purchaseReturn) {
    res.status(404);
    throw new Error("Purchase return not found");
  }

  await adjustPurchaseReturnStock(req.user._id, purchaseReturn.items, []);
  res.json({ message: "Purchase return deleted" });
});
