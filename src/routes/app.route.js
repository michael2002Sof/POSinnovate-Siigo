import { Router } from "express"

import AdminRoute from "./admin.route.js"
import InvetoryRoute from "./inventory.route.js"
import SaleRoute from "./sale.route.js"
import UserRoute from "./user.route.js"
import SubscriptionRoute from "./subscription.route.js"

import AuthController from "../controllers/auth.controller.js"
import BranchController from "../controllers/branch.controller.js"
import ProductSiigoController from "../controllers/product.siigo.controller.js"
import CustomerSiigoController from "../controllers/customer.siigo.controller.js"
import AccountSiigoController from "../controllers/account.siigo.controller.js"
import CreditNoteSiigoController from "../controllers/creditnote.siigo.controller.js"

import qzTray from "../config/qzTray.js"


const route = Router()

route.post("/auth/login", AuthController.Login)

route.use("/subscription", SubscriptionRoute)
route.use("/admin", AdminRoute)
route.use("/inventory", InvetoryRoute)
route.use('/sale', SaleRoute)
route.use("/user", UserRoute)



route.post('/account', AccountSiigoController.CreatePOS);
route.get('/account/:company', AccountSiigoController.AllPOS);
route.put('/account', AccountSiigoController.UpdatePOS);



route.post("/branch", BranchController.Create)
route.get("/branch/:company", BranchController.All)

route.post("/product", ProductSiigoController.create)
route.get("/product/:company", ProductSiigoController.all)
route.get("/product/by/:company/:code", ProductSiigoController.ByCode)
route.get("/product/search/:company/:name", ProductSiigoController.ByName)
route.put("/product", ProductSiigoController.update)



route.post("/creditnote", CreditNoteSiigoController.CreatePOS)
route.get("/creditnote/by/:company/:date", CreditNoteSiigoController.ByDate)

route.get("/customer/by/:company/:identification", CustomerSiigoController.ByIdentification)

route.post("/qz/sign", qzTray.key)


export default route