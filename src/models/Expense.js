import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "General", trim: true },
    amount: { type: Number, required: true, min: 0 },
    gstAmount: { type: Number, default: 0, min: 0 },
    paidBy: { type: String, enum: ["cash", "bank", "upi", "card", "other"], default: "cash" },
    expenseDate: { type: Date, default: Date.now },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export const Expense = mongoose.model("Expense", expenseSchema);
