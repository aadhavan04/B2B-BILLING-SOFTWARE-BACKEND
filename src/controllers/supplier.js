import { Supplier } from "../models/Supplier.js";
import { createCrudController } from "./crudmakeCrud.js";

export const supplier = createCrudController(Supplier, "Supplier");
