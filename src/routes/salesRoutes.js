import express from "express";
import { createSale, deleteSale, getSale, listSales, updateSale, updateSaleStatus } from "../controllers/salesController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, listSales).post(protect, createSale);
router.route("/:id").get(protect, getSale).put(protect, updateSale).patch(protect, updateSale).delete(protect, deleteSale);
router.patch("/:id/status", protect, updateSaleStatus);

export default router;
