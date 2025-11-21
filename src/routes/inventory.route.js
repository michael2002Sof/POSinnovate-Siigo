import { Router } from "express";
import WarehouseSiigoController from "../controllers/inventory/warehouse.siigo.controller.js";

const route = Router()

route.get("/warehouse/:company", WarehouseSiigoController.All)
route.post("/warehouse/pos", WarehouseSiigoController.CreatePOS)
route.get("/warehouse/pos/:company", WarehouseSiigoController.AllPOS)

export default route