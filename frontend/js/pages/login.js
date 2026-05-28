import { login } from '../auth.js';
import { navigate } from '../router.js';
import { alert } from '../ui.js';
import { formToObject } from '../utils.js';

export async function loginPage() {
  if (localStorage.getItem('access_token')) {
    navigate('/', true);
    return '';
  }
  setTimeout(() => {
    const form = document.getElementById('login-form');
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = document.getElementById('login-error');
      box.innerHTML = '';
      const data = formToObject(form);
      try {
        await login(data.username, data.password);
        navigate('/', true);
      } catch (err) {
        box.innerHTML = alert(err.message || 'Неверный логин или пароль');
      }
    });
  }, 0);
  return `
    <div class="login-screen">
      <div class="login-box">
        <div class="login-logo">ИТ</div>
        <div class="login-title">
          <h1>ИТ-Техника</h1>
          <p>Система учёта оборудования АО «ИРЗ»</p>
        </div>
        <div class="card">
          <h2>Вход в систему</h2>
          <div id="login-error"></div>
          <form id="login-form" class="stack">
            <div><label class="label">Логин</label><input class="input" name="username" required autofocus></div>
            <div><label class="label">Пароль</label><input class="input" name="password" type="password" required></div>
            <button class="btn-primary" type="submit">Войти</button>
          </form>
          <p class="tiny" style="text-align:center;margin-top:18px">Для получения доступа обратитесь к администратору системы</p>
        </div>
      </div>
    </div>
  `;
}
