import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    hsnCode: { type: String, trim: true },
    category: { type: String, trim: true },
    unit: { type: String, default: "pcs", trim: true },
    salePrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, default: 0, min: 0 },
    gstRate: { type: Number, default: 18, min: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ owner: 1, sku: 1 }, { unique: true, sparse: true });

export const Product = mongoose.model("Product", productSchema);
