import express from "express";
import { protect } from "../middleware/authMiddleware.js";

export const makeCrudRouter = (controller) => {
  const router = express.Router();

  router
    .route("/")
    .get(protect, controller.list)
    .post(protect, controller.create);

  router
    .route("/:id")
    .get(protect, controller.get)
    .put(protect, controller.update)
    .delete(protect, controller.remove);

  return router;
};

export const makeCrud = makeCrudRouter;