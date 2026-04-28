import { Router } from "express";
import WarehouseSiigoController from "../controllers/inventory/warehouse.siigo.controller.js";
import MovementController from "../controllers/inventory/movement.controller.js";

const route = Router()

route.get("/warehouse/:company", WarehouseSiigoController.All)
route.post("/warehouse/pos", WarehouseSiigoController.CreatePOS)
route.get("/warehouse/pos/:company", WarehouseSiigoController.AllPOS)

route.get("/movement/:company", MovementController.All)
route.get("/movement/product/:company", MovementController.AllProduct)

export default route