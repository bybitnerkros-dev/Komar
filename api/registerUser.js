// api/registerUser.js
// Создание пользователя с сохранением в JSON

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const usersFilePath = path.join(__dirname, "..", "users.json");

// Хэш пароля
function hashPassword(password) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Чтение базы
function loadUsers() {
  try {
    const data = fs.readFileSync(usersFilePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

// Запись базы
function saveUsers(users) {
  fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "POST only" });
  }

  let body = "";
  await new Promise(resolve => {
    req.on("data", chunk => body += chunk);
    req.on("end", resolve);
  });

  let data = {};
  try {
    data = JSON.parse(body);
  } catch {
    return res.status(400).json({ success: false, message: "Bad JSON" });
  }

  const { username, password } = data;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: "Missing username or password" });
  }

  let users = loadUsers();

  // Проверяем, есть ли такой логин
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ success: false, message: "Username already exists" });
  }

  // Сохраняем
  users.push({
    username,
    password: hashPassword(password)
  });

  saveUsers(users);

  return res.json({ success: true, message: "Account created" });
};
