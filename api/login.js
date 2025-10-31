// api/login.js
// Login through Supabase users table

const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

function hashSHA256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Only POST allowed" });
  }

  // Parse JSON body on Vercel if needed
  if (!req.body && req.headers['content-type'] === 'application/json') {
    req.body = await new Promise(resolve => {
      let data = "";
      req.on("data", chunk => data += chunk);
      req.on("end", () => resolve(JSON.parse(data)));
    });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing fields" });
  }

  const passwordHash = hashSHA256(password);

  const { data: user, error } = await supabase
    .from("users")
    .select("id, username")
    .eq("username", username)
    .eq("password_hash", passwordHash)
    .maybeSingle();

  if (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "DB error" });
  }

  if (!user) {
    return res.status(403).json({ success: false, message: "Invalid credentials" });
  }

  return res.status(200).json({
    success: true,
    message: "Login success",
    user
  });
};


