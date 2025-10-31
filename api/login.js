// api/login.js
// Проверка секретного слова (без хэша)

module.exports = async (req, res) => {
    // Проверяем метод
    if (req.method !== 'POST') {
        return res.status(501).send({ success: false, message: "Only POST allowed" });
    }

    // Проверяем тело запроса
    if (!req.body) {
        return res.status(400).send({ success: false, message: "Empty body" });
    }

    const { action, secret, secretWord, secret_word, owner_secret } = req.body;

    // Берем любое поле которое пришло
    const input = (secret || secretWord || secret_word || owner_secret || "").trim().toLowerCase();

    if (action !== "register") {
        return res.status(400).send({ success: false, message: "Invalid action" });
    }

    if (!input) {
        return res.status(400).send({ success: false, message: "Secret required" });
    }

    // ✅ правильное сравнение
    if (input === "komar") {
        return res.status(200).send({
            success: true,
            message: "Secret accepted. Proceed with registration."
        });
    }

    return res.status(403).send({
        success: false,
        message: "Incorrect secret word."
    });
};
