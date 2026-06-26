import { customer } from "../controllers/customer.js";
import { makeCrudRouter } from "./crud.js";

export default makeCrudRouter(customer);
