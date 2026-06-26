import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    hsnCode: { type: String, trim: true },
    qty: { type: Number, required: true, min: 1 },
    unit: { type: String, default: "pcs" },
    price: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    taxableAmount: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const saleSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invoiceNo: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
    customerSnapshot: {
      name: { type: String, required: true },
      phone: String,
      gstNumber: String,
      billingAddress: Object,
    },
    companySnapshot: {
      shopName: String,
      legalName: String,
      phone: String,
      email: String,
      gstNumber: String,
      address: Object,
    },
    items: { type: [saleItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["paid", "partial", "unpaid"], default: "unpaid" },
    paymentMode: { type: String, enum: ["cash", "upi", "card", "bank", "credit"], default: "cash" },
    invoiceDate: { type: Date, default: Date.now },
    notes: String,
  },
  { timestamps: true }
);

saleSchema.index({ owner: 1, invoiceNo: 1 }, { unique: true });

export const Sale = mongoose.model("Sale", saleSchema);