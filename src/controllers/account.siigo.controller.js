import AccountSiigoService from "../services/account.siigo.service.js";

const AccountSiigoController = {
  async CreatePOS (req, res) {
    const data = req.body;
    const response = await AccountSiigoService.CreatePOS(data);
    res.status(response.code).json(response);
  },

  async AllPOS (req, res) {
    const {company} = req.params;
    const response = await AccountSiigoService.AllPOS(company);
    res.status(response.code).json(response);
  },

  async UpdatePOS (req, res) {
    const data = req.body;
    const response = await AccountSiigoService.UpdatePOS(data);
    res.status(response.code).json(response);
  }
};

export default AccountSiigoController