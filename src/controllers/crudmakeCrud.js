export const createCrudController = (Model, resourceName) => ({
  list: async (req, res, next) => {
    try {
      const { page = 1, limit = 20, search = "", active } = req.query;
      const pageNo = Math.max(Number(page), 1);
      const limitNo = Math.min(Math.max(Number(limit), 1), 100);
      const query = { owner: req.user._id };

      if (active !== undefined) query.isActive = active === "true";
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { phone: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { sku: { $regex: search, $options: "i" } },
          { gstNumber: { $regex: search, $options: "i" } },
        ];
      }

      const [data, total] = await Promise.all([
        Model.find(query).sort({ createdAt: -1 }).skip((pageNo - 1) * limitNo).limit(limitNo),
        Model.countDocuments(query),
      ]);

      res.json({ data, total, page: pageNo, pages: Math.ceil(total / limitNo) });
    } catch (error) {
      next(error);
    }
  },

  get: async (req, res, next) => {
    try {
      const doc = await Model.findOne({ _id: req.params.id, owner: req.user._id });
      if (!doc) {
        res.status(404);
        throw new Error(`${resourceName} not found`);
      }
      res.json(doc);
    } catch (error) {
      next(error);
    }
  },

  create: async (req, res, next) => {
    try {
      const doc = await Model.create({ ...req.body, owner: req.user._id });
      res.status(201).json(doc);
    } catch (error) {
      next(error);
    }
  },

  update: async (req, res, next) => {
    try {
      const doc = await Model.findOneAndUpdate(
        { _id: req.params.id, owner: req.user._id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!doc) {
        res.status(404);
        throw new Error(`${resourceName} not found`);
      }
      res.json(doc);
    } catch (error) {
      next(error);
    }
  },

  remove: async (req, res, next) => {
    try {
      const doc = await Model.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
      if (!doc) {
        res.status(404);
        throw new Error(`${resourceName} not found`);
      }
      res.json({ message: `${resourceName} deleted` });
    } catch (error) {
      next(error);
    }
  },
});
