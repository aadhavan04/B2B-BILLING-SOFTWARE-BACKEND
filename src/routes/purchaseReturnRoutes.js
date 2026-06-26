import express from "express";
import {
  createPurchaseReturn,
  deletePurchaseReturn,
  getPurchaseReturn,
  listPurchaseReturns,
  updatePurchaseReturn,
} from "../controllers/purchaseReturnController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, listPurchaseReturns).post(protect, createPurchaseReturn);
router
  .route("/:id")
  .get(protect, getPurchaseReturn)
  .put(protect, updatePurchaseReturn)
  .patch(protect, updatePurchaseReturn)
  .delete(protect, deletePurchaseReturn);

export default router;
