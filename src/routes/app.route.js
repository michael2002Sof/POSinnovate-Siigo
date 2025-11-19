import { Router } from "express"

import AuthController from "../controllers/auth.controller.js"
import RoleController from "../controllers/role.controller.js"
import BranchController from "../controllers/branch.controller.js"
import SalePointController from "../controllers/salepoint.controller.js"
import ProductSiigoController from "../controllers/product.siigo.controller.js"
import InvoiceSiigoController from "../controllers/invoice.siigo.controller.js"
import CustomerSiigoController from "../controllers/customer.siigo.controller.js"
import CostCenterSiigoController from "../controllers/costcenter.siigo.controller.js"
import WareHouseSiigoController from "../controllers/warehouse.siigo.controller.js"
import PaymentSiigoController from "../controllers/payment.siigo.controller.js"
import UserSiigoController from "../controllers/user.siigo.controller.js"
import AccountSiigoController from "../controllers/account.siigo.controller.js"
import CashController from "../controllers/cash.controller.js"
import ReportController from "../controllers/report.controller.js"
import CreditNoteSiigoController from "../controllers/creditnote.siigo.controller.js"


const route = Router()

route.post("/auth/login", AuthController.Login)

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

route.post("/salepoint", SalePointController.RegisterSalePoint)
route.get("/salepoint/:company", SalePointController.AllSalePoint)
route.put("/salepoint", SalePointController.UpdateSalePoint)

route.post("/cash/open", CashController.CashSessionOpen)
route.put("/cash/close", CashController.CashSessionClose)

route.get("/report/by/:id", ReportController.SaleSessionById)
route.get("/report/day/:date", ReportController.SalesByDate)

route.get("/warehouse/:company", WareHouseSiigoController.all)

route.get("/product/by/:company/:code", ProductSiigoController.ByCode)

route.post("/invoice", InvoiceSiigoController.Create)
route.post("/invoice/pos", InvoiceSiigoController.CreatePOS)
route.get("/invoice/type/:company", InvoiceSiigoController.TypeInvoice)

route.post("/creditnote", CreditNoteSiigoController.CreatePOS)

route.get("/payment/method/:company", PaymentSiigoController.method)

route.get("/costcenter/:company", CostCenterSiigoController.all)

route.get("/customer/by/:company/:identification", CustomerSiigoController.ByIdentification)


export default route