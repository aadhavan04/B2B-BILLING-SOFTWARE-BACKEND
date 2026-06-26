import express from "express";
import {
  createSalesReturn,
  deleteSalesReturn,
  getSalesReturn,
  listSalesReturns,
  updateSalesReturn,
} from "../controllers/salesReturnController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, listSalesReturns).post(protect, createSalesReturn);
router
  .route("/:id")
  .get(protect, getSalesReturn)
  .put(protect, updateSalesReturn)
  .patch(protect, updateSalesReturn)
  .delete(protect, deleteSalesReturn);

export default router;
