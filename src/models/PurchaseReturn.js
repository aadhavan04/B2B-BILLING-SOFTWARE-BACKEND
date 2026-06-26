import mongoose from "mongoose";

const purchaseReturnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    name: {
      type: String,
      required: true,
    },

    qty: { type: Number, required: true, min: 0.01 },

    unit: {
      type: String,
      default: "pcs",
    },

    rate: {
      type: Number,
      required: true,
      min: 0,
    },

    gstRate: {
      type: Number,
      default: 18,
      min: 0,
    },

    taxableValue: {
      type: Number,
      required: true,
      min: 0,
    },

    gstAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    _id: false,
  }
);

const purchaseReturnSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    purchase: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Purchase",
      required: true,
    },

    returnNo: {
      type: String,
      required: true,
    },

    returnDate: {
      type: Date,
      default: Date.now,
    },

    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
    },

    supplierSnapshot: {
      name: { type: String, required: true },
      phone: String,
      email: String,
      gstNumber: String,
      address: Object,
    },

    companySnapshot: {
      shopName: String,
      legalName: String,
      phone: String,
      email: String,
      gstNumber: String,
      address: Object,
    },

    items: { type: [purchaseReturnItemSchema], validate: (items) => items.length > 0 },

    subtotal: { type: Number, required: true, min: 0 },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    gstTotal: { type: Number, required: true, min: 0 },

    grandTotal: { type: Number, required: true, min: 0 },

    reason: {
      type: String,
      default: "",
    },

    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

purchaseReturnSchema.index({ owner: 1, returnNo: 1 }, { unique: true });

export const PurchaseReturn = mongoose.model(
  "PurchaseReturn",
  purchaseReturnSchema
);
