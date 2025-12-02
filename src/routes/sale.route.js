import { Router } from "express";
import CostCenterSiigoController from "../controllers/sale/costcenter.siigo.controller.js";
import SalePointController from "../controllers/sale/salepoint.controller.js";
import PaymentSiigoController from "../controllers/sale/payment.siigo.controller.js";
import InvoiceSiigoController from "../controllers/sale/invoice.siigo.controller.js";
import CashController from "../controllers/sale/cash.controller.js";
import ReportController from "../controllers/sale/report.controller.js";
import InvoiceResolutionController from "../controllers/sale/invoiceResolution.controller.js";

const route = Router()

route.get('/costcenter/:company', CostCenterSiigoController.All)
route.get('/costcenter/pos/:company', CostCenterSiigoController.AllPOS)
route.post('/costcenter/pos', CostCenterSiigoController.CreatePOS)

route.post('/point', SalePointController.CreatePOS)
route.get('/point/:company', SalePointController.AllSalePoint)
route.put('/point', SalePointController.UpdateSalePoint)

route.get('/payment/method/:company', PaymentSiigoController.All)
route.post('/payment/method/pos', PaymentSiigoController.CreatePOS)
route.get('/payment/method/pos/:company', PaymentSiigoController.AllPOS)

route.get("/cash/:company/:point", CashController.CashId)
route.post("/cash/open", CashController.CashSessionOpen)
route.put("/cash/close", CashController.CashSessionClose)

route.post("/invoice", InvoiceSiigoController.Create)
route.post("/invoice/pos", InvoiceSiigoController.CreatePOS)
route.get("/invoice/type/:company", InvoiceSiigoController.TypeInvoice)
route.post("/invoice/resolution/pos", InvoiceResolutionController.Create)
route.get("/invoice/resolution/pos/:company", InvoiceResolutionController.AllPOS)

route.get("/report/by/:id", ReportController.SaleSessionById)
route.get("/report/day/:date/:company", ReportController.SessionByDate)
route.get("/report/invoice/pos/by/:date/:company/:user/:page", ReportController.InvoiceByDate)
route.get("/report/invoice/pos/by/:date/:company/:user", ReportController.InvoiceToExport)

export default route