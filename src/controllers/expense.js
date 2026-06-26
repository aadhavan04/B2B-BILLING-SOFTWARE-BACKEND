import { Expense } from "../models/Expense.js";
import { createCrudController } from "./crudmakeCrud.js";

export const expense = createCrudController(Expense, "Expense");
