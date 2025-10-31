export default async function handler(req, res) {
    if (req.method !== "POST") {
        return res.status(501).json({ success: false, message: "Only POST allowed" });
    }

    if (!req.body) {
        return res.status(400).json({ success: false, message: "Empty body" });
    }

    const { action, secret, secretWord, secret_word, owner_secret } = req.body;
    const input = (secret || secretWord || secret_word || owner_secret || "").trim().toLowerCase();

    if (action !== "register") {
        return res.status(400).json({ success: false, message: "Invalid action" });
    }

    if (!input) {
        return res.status(400).json({ success: false, message: "Secret required" });
    }

    if (input === "komar") {
        return res.status(200).json({ success: true, message: "Secret accepted" });
    }

    return res.status(403).json({ success: false, message: "Incorrect secret word" });
}



