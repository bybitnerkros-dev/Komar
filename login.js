// Lightweight Client Login/Register (HYBRID SYSTEM)
// Registration requires Vercel Serverless check (api/login.js) for Secret Word.
// Login/Password storage is done locally via localStorage for user convenience.

// Utility: SHA-256 hash (returns hex)
async function sha256Hex(message) {
  const enc = new TextEncoder();
  const data = enc.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// Obfuscate Storage Keys
const getUserStorageKey = () => btoa('komar_users_v2_hybrid'); // NEW KEY
const getSessionStorageKey = () => btoa('komar_session_v2_hybrid'); // NEW KEY

function getUsers(){
  try{
    return JSON.parse(localStorage.getItem(getUserStorageKey())||'[]');
  }catch(e){ return []; }
}
function saveUsers(u){
  localStorage.setItem(getUserStorageKey(), JSON.stringify(u));
}
function setSession(username){
  localStorage.setItem(getSessionStorageKey(), username);
}
function getSession(){
  return localStorage.getItem(getSessionStorageKey());
}
function clearSession(){
  localStorage.removeItem(getSessionStorageKey());
}

// UI helpers
function $(id){ return document.getElementById(id); }
function showApp(){
  const loginScreen = $('login-screen');
  const appContent = $('app-content');
  if(loginScreen) loginScreen.style.display = 'none';
  if(appContent) appContent.style.visibility = 'visible';
}
function showLogin(){
  const loginScreen = $('login-screen');
  const appContent = $('app-content');
  if(loginScreen) loginScreen.style.display = '';
  if(appContent) appContent.style.visibility = 'hidden';
}

// Build login UI controls and logic
document.addEventListener('DOMContentLoaded', () => {
  const loginScreen = $('login-screen');
  if(!loginScreen) return;
  
  // Re-create UI for structural stability
  loginScreen.innerHTML = `
      <div id="login-card" class="card p-8 w-96">
          <h2 id="auth-title" class="text-2xl font-bold mb-6 text-center" style="color: var(--terminal-green); text-shadow: 0 0 5px rgba(0, 255, 65, 0.8);">
              // AUTH REQUIRED
          </h2>
          <input type="text" id="login-input" placeholder="LOGIN" class="w-full p-3 mb-4 bg-transparent border-b border-gray-600 focus:border-yellow-500 outline-none text-xl" style="color: var(--terminal-green); font-family: monospace;" />
          <input type="password" id="password-input" placeholder="PASSWORD" class="w-full p-3 mb-2 bg-transparent border-b border-gray-600 focus:border-yellow-500 outline-none text-xl" style="color: var(--terminal-green); font-family: monospace;" />
          <input type="text" id="secret-input" placeholder="SECRET WORD (required for registration)" class="w-full p-3 mb-4 bg-transparent border-b border-gray-600 focus:border-yellow-500 outline-none text-sm" style="color: var(--terminal-green); font-family: monospace; display:none" />
          <div class="flex gap-2">
            <button id="login-button" class="btn w-1/2 py-3 text-lg">[ LOGIN ]</button>
            <button id="register-toggle" class="btn w-1/2 py-3 text-lg">[ REGISTER ]</button>
          </div>
          <p id="login-message" class="text-center mt-4 text-red-500 font-semibold"></p>
      </div>
  `;

  const loginButton = $('login-button');
  const registerToggle = $('register-toggle');
  const loginInput = $('login-input');
  const passwordInput = $('password-input');
  const secretInput = $('secret-input');
  const authTitle = $('auth-title');
  const message = $('login-message'); 

  let registerMode = false;

  function setMode(reg){
    registerMode = !!reg;
    if(registerMode){
      authTitle.textContent = '// REGISTER';
      registerToggle.textContent = '[ BACK ]';
      loginButton.textContent = '[ CREATE ACCOUNT ]'; 
      secretInput.style.display = '';
      message.textContent = 'Enter a new login/password and the secret word to register.';
      message.style.color = 'var(--terminal-green)';
    } else {
      authTitle.textContent = '// AUTH REQUIRED';
      registerToggle.textContent = '[ REGISTER ]';
      loginButton.textContent = '[ LOGIN ]';
      secretInput.style.display = 'none';
      message.textContent = '';
    }
  }

  setMode(false);

  registerToggle.addEventListener('click', (e)=>{
    setMode(!registerMode);
  });

  const session = getSession();
  if(session){
    showApp();
    return;
  }
  
  // ====================================================================
  // CORE LOGIN/REGISTER LOGIC (HYBRID)
  // ====================================================================

  loginButton.addEventListener('click', async ()=>{
    const user = loginInput.value.trim();
    const pass = passwordInput.value;
    const secret = secretInput.value.trim();
    let users = getUsers();
    
    message.textContent = 'Processing...';
    message.style.color = 'var(--terminal-green)';
    
    if(!user || !pass){
      message.textContent = 'Введите логин и пароль.';
      message.style.color = 'red';
      return;
    }

    if(registerMode){
      // 1. ПРОВЕРКА СЕКРЕТНОГО СЛОВА (ЧЕРЕЗ СЕРВЕР VERCEL)
      try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'register', secret: secret }) // Отправляем только secret
        });
        const data = await response.json();

        if (response.status !== 200 || !data.success) {
             message.textContent = data.message || 'Ошибка сервера при проверке секретного слова.';
             message.style.color = 'red';
             return;
        }

        // 2. РЕГИСТРАЦИЯ НА КЛИЕНТЕ (Если сервер подтвердил Секрет)
        if(users.find(u=>u.username===user)){
          message.textContent = 'Пользователь с таким именем уже существует.';
          message.style.color = 'red';
          return;
        }
        
        // Хэшируем и сохраняем новый Логин/Пароль в localStorage
        const hash = await sha256Hex(pass);
        users.push({ username: user, passHash: hash });
        saveUsers(users);
        setSession(user);
        
        message.textContent = 'Регистрация успешна. Вход выполнен.';
        message.style.color = 'var(--terminal-green)';
        setTimeout(()=> showApp(), 400);

      } catch (e) {
          message.textContent = 'Не удалось подключиться к серверу аутентификации.';
          message.style.color = 'red';
      }
      return;
      
    } else {
      // Login Flow (Локальное хранение)
      const hash = await sha256Hex(pass);
      const found = users.find(u=>u.username===user && u.passHash===hash);
      
      if(found){
        setSession(user);
        message.textContent = 'ACCESS GRANTED.';
        message.style.color = 'var(--terminal-green)';
        setTimeout(()=> showApp(), 300);
        return;
      } else {
        message.textContent = 'ACCESS DENIED. Incorrect login or password.';
        message.style.color = 'red';
        return;
      }
    }
  });

  // Enter key support
  passwordInput.addEventListener('keypress', function(e){
    if(e.key === 'Enter') loginButton.click();
  });
});