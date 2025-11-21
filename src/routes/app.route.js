import { Router } from "express"

import InvetoryRoute from "./inventory.route.js"
import SaleRoute from "./sale.route.js"

import AuthController from "../controllers/auth.controller.js"
import RoleController from "../controllers/role.controller.js"
import BranchController from "../controllers/branch.controller.js"
import ProductSiigoController from "../controllers/product.siigo.controller.js"
import CustomerSiigoController from "../controllers/customer.siigo.controller.js"
import UserSiigoController from "../controllers/user.siigo.controller.js"
import AccountSiigoController from "../controllers/account.siigo.controller.js"
import ReportController from "../controllers/report.controller.js"
import CreditNoteSiigoController from "../controllers/creditnote.siigo.controller.js"


const route = Router()

route.post("/auth/login", AuthController.Login)

route.use("/inventory", InvetoryRoute)
route.use('/sale', SaleRoute)

route.post("/rol", RoleController.RegisterRole)
route.get("/rol/:company", RoleController.AllRole)
route.put("/rol", RoleController.UpdateRole)

route.post('/account', AccountSiigoController.CreatePOS);
route.get('/account/:company', AccountSiigoController.AllPOS);
route.put('/account', AccountSiigoController.UpdatePOS);

route.get("/user/:company", UserSiigoController.all)
route.post("/user/pos", UserSiigoController.CreatePOS)
route.get("/user/pos/:company", UserSiigoController.allPOS)

route.post("/branch", BranchController.Create)
route.get("/branch/:company", BranchController.All)

route.get("/report/by/:id", ReportController.SaleSessionById)
route.get("/report/day/:date", ReportController.SalesByDate)

route.get("/product/by/:company/:code", ProductSiigoController.ByCode)



route.post("/creditnote", CreditNoteSiigoController.CreatePOS)
route.get("/creditnote/by/:company/:date", CreditNoteSiigoController.ByDate)

route.get("/customer/by/:company/:identification", CustomerSiigoController.ByIdentification)


export default route