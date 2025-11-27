import { Router } from "express";

import UserSiigoController from "../controllers/user/user.siigo.controller.js";
import RoleController from "../controllers/user/role.controller.js";

const route = Router()

route.get("/:company", UserSiigoController.all)
route.post("/pos", UserSiigoController.CreatePOS)
route.get("/pos/:company", UserSiigoController.allPOS)

route.post("/rol", RoleController.RegisterRole)
route.get("/rol/:company", RoleController.AllRole)
route.put("/rol", RoleController.UpdateRole)

export default route