import mongoose from "mongoose";

const salesReturnItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },

    name: {
      type: String,
      required: true,
    },

    hsnCode: {
      type: String,
      trim: true,
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

const salesReturnSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    saleInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesInvoice",
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

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
    },

    customerSnapshot: {
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

    items: { type: [salesReturnItemSchema], validate: (items) => items.length > 0 },

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

salesReturnSchema.index({ owner: 1, returnNo: 1 }, { unique: true });

export const SalesReturn = mongoose.model(
  "SalesReturn",
  salesReturnSchema
);
