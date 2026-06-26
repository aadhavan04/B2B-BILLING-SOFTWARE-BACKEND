import express from "express";
import { getCompany, updateCompany } from "../controllers/companyController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.route("/").get(protect, getCompany).put(protect, updateCompany);

export default router;
