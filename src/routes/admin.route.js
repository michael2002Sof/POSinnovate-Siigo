import { Router } from "express";

import AdminController from "../controllers/admin/admin.controller.js";
import CompanyController from "../controllers/admin/company.controller.js";
import PlanController from "../controllers/admin/plan.controller.js";

const route = Router();

route.get("/data/:admin", AdminController.Data);
route.get("/company/:company", CompanyController.Data)
route.get("/plan/:admin", PlanController.Data)


export default route;