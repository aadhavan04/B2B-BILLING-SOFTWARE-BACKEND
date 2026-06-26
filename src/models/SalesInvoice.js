import mongoose from "mongoose";

const salesItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    name: { type: String, required: true },
    hsnCode: { type: String, trim: true },
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

const salesInvoiceSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    invoiceNo: { type: String, required: true },
    invoiceDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "Customer" },
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
    items: { type: [salesItemSchema], validate: (items) => items.length > 0 },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    gstTotal: { type: Number, required: true, min: 0 },
    grandTotal: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "unpaid", "partial", "paid", "cancelled"], default: "unpaid" },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

salesInvoiceSchema.index({ owner: 1, invoiceNo: 1 }, { unique: true });

export const SalesInvoice = mongoose.model("SalesInvoice", salesInvoiceSchema);
