// Serverless Function: api/login.js
// ОТВЕЧАЕТ ТОЛЬКО ЗА ПРОВЕРКУ СЕКРЕТНОГО СЛОВА.

const sha256 = async (message) => {
    // Используем встроенный модуль 'crypto'
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(message).digest('hex');
};

// Переменная окружения Vercel (вы должны ее установить!)
const OWNER_SECRET_HASH = "komar";

// ИСПОЛЬЗУЕМ module.exports = (req, res) => { ... }
module.exports = async (req, res) => {
    
    // 1. Проверка метода (должен быть POST)
    if (req.method !== 'POST') {
        // Возвращаем 501, если это не POST
        return res.status(501).send({ success: false, message: "Method Not Implemented. Only POST requests are supported." });
    }

    if (!OWNER_SECRET_HASH) {
        return res.status(500).send({ success: false, message: "Server configuration error: Missing secret hash." });
    }
    
    if (!req.body) {
        return res.status(400).send({ success: false, message: "Request body is empty." });
    }
    
    const { action, secret } = req.body;

    try {
        if (action === 'register') {
            // Регистрация: проверяем только Секретное Слово
            if (!secret) return res.status(400).send({ success: false, message: "Secret word is required for registration." });
            
            const inputSecretHash = await sha256(secret);
            
            if (inputSecretHash === OWNER_SECRET_HASH) {
                // УСПЕХ: Возвращаем разрешение на регистрацию
                return res.status(200).send({ success: true, message: "Secret accepted. Client can proceed with registration." });
            } else {
                return res.status(403).send({ success: false, message: "Incorrect secret word." });
            }

        } else {
            return res.status(400).send({ success: false, message: "Invalid action or missing 'action' parameter." });
        }
    } catch (error) {
        console.error("Serverless error:", error.message);
        return res.status(500).send({ success: false, message: "An unexpected server error occurred." });
    }
};