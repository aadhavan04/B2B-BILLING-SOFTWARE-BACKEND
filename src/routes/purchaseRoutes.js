import express from "express";
import { createPurchase, deletePurchase, getPurchase, listPurchases, updatePurchase } from "../controllers/purchaseController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, listPurchases).post(protect, createPurchase);
router.route("/:id").get(protect, getPurchase).put(protect, updatePurchase).patch(protect, updatePurchase).delete(protect, deletePurchase);

export default router;
