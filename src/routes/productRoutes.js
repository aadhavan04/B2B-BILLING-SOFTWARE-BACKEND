import { product } from "../controllers/product.js";
import { makeCrudRouter } from "./crud.js";

export default makeCrudRouter(product);