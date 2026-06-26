import { User } from "../models/User.js";
import { Company } from "../models/Company.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { generateToken } from "../utils/generateToken.js";

const userResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  token: generateToken(user._id),
});

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, companyName } = req.body;

  if (!name || !email || !password || !companyName) {
    res.status(400);
    throw new Error("Name, email, password and company name are required");
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error("Email already registered");
  }

  const user = await User.create({ name, email, password });

  await Company.create({
    owner: user._id,
    shopName: companyName.trim(),
  });

  res.status(201).json(userResponse(user));
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Invalid email or password");
  }

  res.json(userResponse(user));
});

export const me = asyncHandler(async (req, res) => {
  res.json(req.user);
});
