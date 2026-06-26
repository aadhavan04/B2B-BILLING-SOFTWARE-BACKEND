import { Product } from "../models/Product.js";
import { createCrudController } from "./crudmakeCrud.js";

export const product = createCrudController(Product, "Product");
