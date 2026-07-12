import axios from "axios";
import { jwtDecode } from "jwt-decode"
import { pool } from "../database/conexion.js";

const tokenCache = new Map(); // Cache por empresa
const SIIGO_REQUEST_TIMEOUT = 60000;
const TOKEN_BUFFER_SECONDS = 60; // Renovar 1 minuto antes de que expire

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

        //console.log("Credenciales pedidas:", rows[0])
        return rows[0] || null;
    },

    // ----------------------------------------------------
    // Obtener token válido (con caché inteligente)
    // ----------------------------------------------------
    async getToken(company, forceRefresh = false) {
        const cached = tokenCache.get(company);

        // Si existe en caché y no está vencido, usarlo
        if (!forceRefresh && cached && cached.expires > new Date()) {
            return cached.token;
        }

        const credentials = await this.getCredentials(company);
        if (!credentials) {
            throw new Error(`No se encontraron credenciales de Siigo para la empresa: ${company}`);
        }

        try {
            // Limpiamos posibles espacios en blanco invisibles de la DB
            const username = credentials.email.trim();
            const access_key = credentials.api_key.trim();

            console.log("Intentando autenticar con Siigo...");

            const { data } = await axios.post(
                "https://api.siigo.com/auth", 
                { username, access_key },
                { timeout: SIIGO_REQUEST_TIMEOUT }
            );

            const payload = jwtDecode(data.access_token);
            //console.log("Token decodificado:", payload);

            //console.log("Informacion del token:", data)
            
            if (!data?.access_token) {
                throw new Error("Siigo autenticó pero no devolvió el campo 'access_token'");
            }

            const expiresIn = data.expires_in || 3600;

            // Restamos el buffer de seguridad
            const expires = new Date(
                Date.now() + (expiresIn - TOKEN_BUFFER_SECONDS) * 1000
            );

            tokenCache.set(company, {
                token: data.access_token,
                expires
            });

            //console.log(`[Siigo Auth] Token generado exitosamente para: ${company}`);
            return data.access_token;
            
        } catch (error) {
            // Si falla la autenticación, limpiamos la caché por seguridad
            console.error("ERROR COMPLETO:", error);

            console.error("response:", error.response?.data);
            console.error("status:", error.response?.status);
            console.error("message:", error.message);
            tokenCache.delete(company);
            
            const errorDetail = error.response?.data?.Message || error.response?.data?.Errors?.[0]?.Message || error.message;
            throw new Error(`[Siigo Auth Error]: ${errorDetail}`);
        }
    },

    // ----------------------------------------------------
    // Crear cliente Axios para Siigo
    // ----------------------------------------------------
    async createClient(company) {
        const token = await this.getToken(company);
        if (!token) {
            throw new Error("No se pudo obtener un token válido de Siigo");
        }

        const client = axios.create({
            baseURL: "https://api.siigo.com/v1/", // Sin barra diagonal al final para evitar conflictos de rutas
            timeout: SIIGO_REQUEST_TIMEOUT,
            headers: {
                "Authorization": `Bearer ${token}`,
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

                // Si es un 401 y no hemos intentado reintentar todavía
                if (error.response?.status === 401 && !originalRequest._retry) {
                    originalRequest._retry = true;
                    console.warn(`[Siigo Interceptor] Detectado 401 en ${originalRequest.url}. Intentando renovar token...`);

                    try {
                        // Forzar la renovación del token en la caché e itinerario
                        const newToken = await this.getToken(company, true);

                        // Actualizar la cabecera del request original
                        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;
                        
                        // IMPORTANTE: Usamos la instancia global de axios para el reintento.
                        // Esto evita bucles infinitos si las credenciales de la DB están mal y el token nuevo sigue dando 401.
                        return axios(originalRequest); 
                        
                    } catch (refreshError) {
                        console.error("[Siigo Interceptor] Falló la renovación del token en el reintento.");
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