import { expense } from "../controllers/expense.js";
import { makeCrudRouter } from "./crud.js";

export default makeCrudRouter(expense);