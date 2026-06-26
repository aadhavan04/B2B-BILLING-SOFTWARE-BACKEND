import { Customer } from "../models/Customer.js";
import { createCrudController } from "./crudmakeCrud.js";

export const customer = createCrudController(Customer, "Customer");
