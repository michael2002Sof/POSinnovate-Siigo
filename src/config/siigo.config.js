// src/config/siigo.config.js

import axios from "axios";
import { pool } from "../database/conexion.js";

const tokenCache = new Map(); // Cache por empresa

const SiigoConfig = {

    // ----------------------------------------------------
    // Obtener credenciales de la BD (por empresa)
    // ----------------------------------------------------
    async getCredentials(company) {
        const [rows] = await pool.query(
            "SELECT email, api_key FROM account WHERE company = ? AND provider = 'siigo' LIMIT 1",
            [company]
        );
        return rows[0] || null;
    },

    // ----------------------------------------------------
    // Generar Token Siigo con cache
    // ----------------------------------------------------
    async getToken(company) {
        const cached = tokenCache.get(company);

        if (cached && cached.expires > new Date()) {
            //console.log(`♻️ Usando token en caché Siigo → Empresa ${company}`);
            return cached.token;
        }

        const credentials = await this.getCredentials(company);
        console.log(credentials)
        if (!credentials) throw new Error("No se encontraron credenciales de Siigo");

        //console.log(`🔐 Solicitando token Siigo → Empresa ${company}`);

        const { data } = await axios.post("https://api.siigo.com/auth", {
            username: credentials.email,
            access_key: credentials.api_key,
        });

        const expires = new Date(Date.now() + 55 * 60 * 1000);

        tokenCache.set(company, {
            token: data.access_token,
            expires,
        });

        console.log("✅ Token Siigo renovado");

        return data.access_token;
    },

    // ----------------------------------------------------
    // 🔧 Crear cliente Axios para Siigo
    // ----------------------------------------------------
    async createClient(company) {
        const token = await this.getToken(company);

        return axios.create({
            baseURL: "https://api.siigo.com/v1/",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "Partner-Id": "POSMundoCarnes",
            }
        });
    },

    // ----------------------------------------------------
    // GET paginado genérico
    // ----------------------------------------------------
    async Paginated(client, endpoint) {
        let page = 1;
        let all = [];

        while (true) {
            const { data } = await client.get(endpoint, {
                params: { page, page_size: 100 }
            });

            all.push(...(data.results || []));

            if (!data.pagination?.next_page) break;
            page = data.pagination.next_page;
        }

        return all;
    }

};

export default SiigoConfig;
