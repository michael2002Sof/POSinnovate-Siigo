import { Router } from "express"
import crypto from "crypto";
import fs from "fs";
import path from "path";

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

route.get("/product/by/:company/:code", ProductSiigoController.ByCode)



route.post("/creditnote", CreditNoteSiigoController.CreatePOS)
route.get("/creditnote/by/:company/:date", CreditNoteSiigoController.ByDate)

route.get("/customer/by/:company/:identification", CustomerSiigoController.ByIdentification)

const privateKeyPath = path.join(process.cwd(), "qz-private-key.pem");
const privateKey = fs.readFileSync(privateKeyPath, "utf8");


// Endpoint de firma dentro del router
route.post("/qz/sign", (req, res) => {
    try {
        const { toSign } = req.body;

        const signer = crypto.createSign("RSA-SHA256");
        signer.update(toSign, "utf8");
        signer.end();

        const signature = signer.sign(privateKey, "base64");
        res.json({ signature });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


export default route