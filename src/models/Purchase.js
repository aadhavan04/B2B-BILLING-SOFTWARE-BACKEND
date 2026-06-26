import mongoose from "mongoose";

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 0.01 },
    unit: { type: String, default: "pcs" },
    rate: { type: Number, required: true, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    taxableValue: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    purchaseNo: { type: String, required: true },
    purchaseDate: { type: Date, default: Date.now },
    supplier: { type: mongoose.Schema.Types.ObjectId, ref: "Supplier" },
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
    items: { type: [purchaseItemSchema], validate: (items) => items.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gstTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["unpaid", "partial", "paid", "cancelled"], default: "unpaid" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

purchaseSchema.index({ owner: 1, purchaseNo: 1 }, { unique: true });

export const Purchase = mongoose.model("Purchase", purchaseSchema);
