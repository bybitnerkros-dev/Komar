// api/registerUser.js
// Create user in Supabase via serverless function

const crypto = require("crypto");

// Import Supabase client for serverless environment
const { createClient } = require("@supabase/supabase-js");

// Environment vars from Vercel
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Hash function
function hashSHA256(text) {
    return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.status(405).json({ success: false, message: "Only POST allowed" });
    }

    const { username, password, secret } = req.body;

    if (!username || !password || !secret) {
        return res.status(400).json({ success: false, message: "Missing fields" });
    }

    // ✅ Реальный захэшированный секрет (тот же, что и в login.js)
    const OWNER_SECRET_HASH = process.env.OWNER_SECRET_HASH;

    if (!OWNER_SECRET_HASH) {
        return res.status(500).json({ success: false, message: "Missing OWNER_SECRET_HASH env variable" });
    }

    const secretHash = hashSHA256(secret);
    if (secretHash !== OWNER_SECRET_HASH) {
        return res.status(403).json({ success: false, message: "Wrong secret word" });
    }

    const passwordHash = hashSHA256(password);

    // Проверяем, нет ли такого юзера
    const { data: existing } = await supabase
        .from("users")
        .select("id")
        .eq("username", username)
        .maybeSingle();

    if (existing) {
        return res.status(409).json({ success: false, message: "User already exists" });
    }

    // Создаем юзера в Supabase
    const { data, error } = await supabase
        .from("users")
        .insert([{ username, password_hash: passwordHash }])
        .select();

    if (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: "DB error" });
    }

    return res.status(200).json({ success: true, message: "User registered", user: data });
};
