// src/config/siigo.config.js

import axios from "axios";
import { pool } from "../database/conexion.js";

const tokenCache = new Map(); // Cache por empresa
const SIIGO_REQUEST_TIMEOUT = 60000;
const TOKEN_BUFFER_SECONDS = 60; // renovar 1 minuto antes

const SiigoConfig = {

    // ----------------------------------------------------
    // Obtener credenciales de la BD (por empresa)
    // ----------------------------------------------------
    async getCredentials(company) {
        const [rows] = await pool.query(
            `SELECT email, api_key 
            FROM account 
            WHERE company = ? 
            AND provider = 'siigo' 
            LIMIT 1`,
            [company]
        );
        return rows[0] || null;
    },

    // ----------------------------------------------------
    // Obtener token válido (con cache inteligente)
    // ----------------------------------------------------
    async getToken(company, forceRefresh = false) {
   
        const cached = tokenCache.get(company);

        // Si existe y no está vencido, usarlo
        if (
            !forceRefresh &&
            cached && 
            cached.expires > new Date()
        ) {
            return cached.token;
        }

        const credentials = await this.getCredentials(company);
        if (!credentials) {
            throw new Error("No se encontraron credenciales de Siigo");
        }

        try {
            const { data } = await axios.post(
                "https://api.siigo.com/auth", 
                {
                    username: credentials.email,
                    access_key: credentials.api_key,
                },
                { timeout: SIIGO_REQUEST_TIMEOUT }
            );
            
            if (!data?.access_token) {
                throw new Error("Siigo no devolvió access_token");
            }

            const expiresIn = data.expires_in || 3600

            //Restamos buffer de seguridad
            const expires = new Date(
                Date.now() + (expiresIn - TOKEN_BUFFER_SECONDS) * 1000
            )

            tokenCache.set(company, {
                token: data.access_token,
                expires
            })

            return data.access_token
        } catch (error) {
            tokenCache.delete(company);
            throw new Error(
                `Error generando token Siigo: ${error.response?.data?.message || error.message}`
            );
        }
    },

    // ----------------------------------------------------
    // 🔧 Crear cliente Axios para Siigo
    // ----------------------------------------------------
    async createClient(company) {
        const token = await this.getToken(company);
        if(!token) {
            throw new Error("No se pudo obtener token válido de Siigo");
        }

        const client = axios.create({
            baseURL: "https://api.siigo.com/v1/",
            timeout: SIIGO_REQUEST_TIMEOUT,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                "Partner-Id": "POSMundoCarnes",
            }
        });

         // ----------------------------------------------------
        // Interceptor para manejar 401 automáticamente
        // ----------------------------------------------------
        client.interceptors.response.use(
            (response) => response,
            async (error) => {

                const originalRequest = error.config;

                if (
                    error.response?.status === 401 &&
                    !originalRequest._retry
                ) {
                    originalRequest._retry = true;

                    try {
                        // Forzar renovación
                        const newToken = await this.getToken(company, true);

                        originalRequest.headers.Authorization =
                            `Bearer ${newToken}`;

                        return client.request(originalRequest);
                    } catch (refreshError) {
                        return Promise.reject(refreshError);
                    }
                }

                return Promise.reject(error);
            }
        );
        return client;
    }
};

export default SiigoConfig;
