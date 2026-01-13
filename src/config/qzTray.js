import crypto from "crypto";
import fs from "fs";
import path from "path";

const privateKeyPath = path.join(process.cwd(), "qz-private-key.pem");
const privateKey = fs.readFileSync(privateKeyPath, "utf8");

const qzTray = {
    async key(req, res) {
        try {
            const { toSign } = req.body;

            if (!toSign) {
                return res.status(400).json({ error: "toSign is required" });
            }

            const signer = crypto.createSign("RSA-SHA256");
            signer.update(toSign, "utf8");
            signer.end();

            const signature = signer.sign(privateKey, "base64");
            res.json({ signature });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
}

export default qzTray