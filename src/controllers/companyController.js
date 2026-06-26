import { Company } from "../models/Company.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getCompany = asyncHandler(async (req, res) => {
  const company = await Company.findOne({ owner: req.user._id });
  res.json(company || null);
});

// Company (shop) name is set once at registration and can never be changed
// from here. Only the supporting details below are editable.
export const updateCompany = asyncHandler(async (req, res) => {
  const { shopName, owner, _id, ...editableFields } = req.body;

  const company = await Company.findOneAndUpdate(
    { owner: req.user._id },
    { $set: editableFields },
    { new: true, runValidators: true }
  );

  if (!company) {
    res.status(404);
    throw new Error("Company profile not found");
  }

  res.json(company);
});
