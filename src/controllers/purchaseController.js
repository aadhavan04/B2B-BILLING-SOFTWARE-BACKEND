import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { Purchase } from "../models/Purchase.js";
import { Supplier } from "../models/Supplier.js";
import { Company } from "../models/Company.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { calculateItems, roundMoney } from "../utils/calcTotals.js";

const nextPurchaseNo = async (owner) => {
  const count = await Purchase.countDocuments({ owner });
  return `PUR-${String(count + 1).padStart(5, "0")}`;
};

const getSelectedSupplierId = ({ supplierId, supplier }) => {
  if (typeof supplierId === "string") return supplierId;
  if (supplierId?._id) return supplierId._id;
  if (supplierId?.id) return supplierId.id;
  if (supplierId?.value) return supplierId.value;
  if (typeof supplier === "string") return supplier;
  if (supplier?._id) return supplier._id;
  if (supplier?.id) return supplier.id;
  if (supplier?.value) return supplier.value;
  return null;
};

const getSupplierFallback = (supplier) =>
  supplier && typeof supplier === "object" ? supplier : {};

const buildSupplierSnapshot = (dbSupplier, supplierFallback = {}) => ({
  name: dbSupplier?.name || supplierFallback.name || supplierFallback.label || "Unknown Supplier",
  phone: dbSupplier?.phone || supplierFallback.phone,
  email: dbSupplier?.email || supplierFallback.email,
  gstNumber: dbSupplier?.gstNumber || supplierFallback.gstNumber,
  address: dbSupplier?.address || supplierFallback.address,
});

const adjustPurchaseStock = async (owner, oldItems = [], newItems = []) => {
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
        Product.updateOne(
          { _id: productId, owner },
          { $inc: { stock: qty } }
        )
      )
  );
};

const normalizeEditableItems = (items) =>
  items.map((item) => (typeof item.toObject === "function" ? item.toObject() : item));

export const listPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ owner: req.user._id })
    .populate("supplier", "name phone email gstNumber address")
    .sort({ purchaseDate: -1, createdAt: -1 });
  res.json(purchases);
});

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, owner: req.user._id })
    .populate("supplier", "name phone email gstNumber address");
  if (!purchase) {
    res.status(404);
    throw new Error("Purchase not found");
  }
  res.json(purchase);
});

export const createPurchase = asyncHandler(async (req, res) => {
  const { supplierId, supplier, items = [], discount = 0, paidAmount = 0 } = req.body;

  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const selectedSupplierId = getSelectedSupplierId({ supplierId, supplier });
  const supplierFallback = getSupplierFallback(supplier);
  if (selectedSupplierId && !mongoose.isValidObjectId(selectedSupplierId)) {
    res.status(400);
    throw new Error("Selected supplier not found");
  }

  const dbSupplier = selectedSupplierId
    ? await Supplier.findOne({ _id: selectedSupplierId, owner: req.user._id })
    : null;

  if (selectedSupplierId && !dbSupplier) {
    res.status(400);
    throw new Error("Selected supplier not found");
  }

  const company = await Company.findOne({ owner: req.user._id });
  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  const purchase = await Purchase.create({
    owner: req.user._id,
    purchaseNo: req.body.purchaseNo || (await nextPurchaseNo(req.user._id)),
    purchaseDate: req.body.purchaseDate || new Date(),
    supplier: dbSupplier?._id,
    supplierSnapshot: buildSupplierSnapshot(dbSupplier, supplierFallback),
    companySnapshot: company ? company.toObject() : {},
    items: calculatedItems,
    subtotal: roundMoney(subtotal),
    discount: roundMoney(discount),
    gstTotal: roundMoney(gstTotal),
    grandTotal,
    paidAmount: roundMoney(paidAmount),
    status: Number(paidAmount) >= grandTotal ? "paid" : Number(paidAmount) > 0 ? "partial" : "unpaid",
    notes: req.body.notes,
  });

  await Promise.all(
    calculatedItems
      .filter((item) => item.product)
      .map((item) =>
        Product.updateOne(
          { _id: item.product, owner: req.user._id },
          { $inc: { stock: Number(item.qty) } }
        )
      )
  );

  res.status(201).json(purchase);
});

export const updatePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, owner: req.user._id });
  if (!purchase) {
    res.status(404);
    throw new Error("Purchase not found");
  }

  const items = normalizeEditableItems(req.body.items ?? purchase.items);
  if (!items.length) {
    res.status(400);
    throw new Error("At least one item is required");
  }

  const hasSupplierChange = Object.hasOwn(req.body, "supplierId") || Object.hasOwn(req.body, "supplier");
  if (hasSupplierChange) {
    const { supplierId, supplier } = req.body;
    const selectedSupplierId = getSelectedSupplierId({ supplierId, supplier });
    const supplierFallback = getSupplierFallback(supplier);
    if (selectedSupplierId && !mongoose.isValidObjectId(selectedSupplierId)) {
      res.status(400);
      throw new Error("Selected supplier not found");
    }

    const dbSupplier = selectedSupplierId
      ? await Supplier.findOne({ _id: selectedSupplierId, owner: req.user._id })
      : null;

    if (selectedSupplierId && !dbSupplier) {
      res.status(400);
      throw new Error("Selected supplier not found");
    }

    purchase.supplier = dbSupplier?._id;
    purchase.supplierSnapshot = buildSupplierSnapshot(dbSupplier, supplierFallback);
  }

  const { items: calculatedItems, subtotal, gstTotal } = calculateItems(items);
  const discount = req.body.discount ?? purchase.discount;
  const paidAmount = req.body.paidAmount ?? purchase.paidAmount;
  const grandTotal = roundMoney(subtotal + gstTotal - Number(discount || 0));

  await adjustPurchaseStock(req.user._id, purchase.items, calculatedItems);

  purchase.purchaseNo = req.body.purchaseNo ?? purchase.purchaseNo;
  purchase.purchaseDate = req.body.purchaseDate ?? purchase.purchaseDate;
  purchase.items = calculatedItems;
  purchase.subtotal = roundMoney(subtotal);
  purchase.discount = roundMoney(discount);
  purchase.gstTotal = roundMoney(gstTotal);
  purchase.grandTotal = grandTotal;
  purchase.paidAmount = roundMoney(paidAmount);
  purchase.status = req.body.status || (Number(paidAmount) >= grandTotal ? "paid" : Number(paidAmount) > 0 ? "partial" : "unpaid");
  purchase.notes = req.body.notes ?? purchase.notes;

  await purchase.save();
  res.json(purchase);
});

export const deletePurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
  if (!purchase) {
    res.status(404);
    throw new Error("Purchase not found");
  }
  res.json({ message: "Purchase deleted" });
});
