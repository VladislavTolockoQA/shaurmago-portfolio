// --- Файл: scripts.js (ОБНОВЛЕН) ---
document.addEventListener('DOMContentLoaded', () => {
  // ==== Конфигурация и Утилиты ====
  const API_BASE_URL = 'http://127.0.0.1:5000/api'; // Обновленный URL с префиксом, стандарный http://127.0.0.1:5000/api и еще есть https://nasally-initiative-macaw.cloudpub.ru/api


  function getToken() {
    return localStorage.getItem('shaurma_token');
  }

  function logout() {
    localStorage.removeItem('shaurma_token');
    localStorage.removeItem('order_id');
    window.location.href = 'login.html';
  }

  function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast-notification ${isError ? 'error' : ''}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(API_BASE_URL + url, { ...options, headers });
    
    // Автоматический выход, если токен недействителен
    if (response.status === 401) {
      showToast('Сессия истекла. Пожалуйста, войдите снова.', true);
      logout();
    }
    return response;
  }

  function requireAuth() {
    if (!getToken()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  // ==== ОБЩИЕ ЭЛЕМЕНТЫ (Кнопка выхода) ====
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  // ==== РЕГИСТРАЦИЯ (register.html) ====
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirm = document.getElementById('confirm').value;

      if (password !== confirm) {
        return showToast("Пароли не совпадают", true);
      }
      
      const res = await fetch(`${API_BASE_URL}/register`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      const data = await res.json();
      if (res.ok) {
        showToast("Регистрация прошла успешно! Теперь вы можете войти.");
        setTimeout(() => window.location.href = 'login.html', 2000);
      } else {
        showToast(data.error || 'Ошибка регистрации', true);
      }
    });
  }

  // ==== АВТОРИЗАЦИЯ (login.html) ====
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;

      const res = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
      });
      
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('shaurma_token', data.token);
        window.location.href = 'index.html';
      } else {
        showToast(data.error || 'Ошибка входа', true);
      }
    });
  }

  // ==== МЕНЮ (index.html) ====
  const menuDiv = document.getElementById('menu');
  if (menuDiv) {
    if (!requireAuth()) return;

    document.getElementById('cartBtn').addEventListener('click', () => window.location.href = 'cart.html');
    
    // НОВЫЙ ОБРАБОТЧИК ДЛЯ КНОПКИ ОШИБКИ
    document.getElementById('errorBtn').addEventListener('click', async () => {
        showToast("Отправка запроса, который вызовет ошибку 500...", false);
        const res = await fetchWithAuth('/force-error');
        if (!res.ok) {
            const data = await res.json();
            showToast(`Получена ожидаемая ошибка: ${data.error}`, true);
        }
    });
    
    async function loadMenu() {
      menuDiv.innerHTML = '<p>Загрузка меню...</p>';
      const res = await fetchWithAuth('/menu');
      if (!res.ok) {
        menuDiv.innerHTML = '<p class="error">Не удалось загрузить меню.</p>';
        return;
      }
      const menu = await res.json();
      menuDiv.innerHTML = '';
      menu.forEach(item => {
        const div = document.createElement('div');
        div.className = 'menu-item';
        div.innerHTML = `
          <div class="item-info">
            <img src="${item.img}" alt="${item.name}" onerror="this.src='images/placeholder.png'">
            <div class="item-details"><strong>${item.name}</strong><span>${item.price} ₽</span></div>
          </div>
          <button class="add-to-cart-btn" data-id="${item.id}">В корзину</button>`;
        menuDiv.appendChild(div);
      });

      document.querySelectorAll('.add-to-cart-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const itemId = e.target.dataset.id;
            const res = await fetchWithAuth('/cart/add', {
                method: 'POST',
                body: JSON.stringify({ item_id: parseInt(itemId), quantity: 1 })
            });
            const data = await res.json();
            showToast(data.message || data.error, !res.ok);
        });
      });
    }
    loadMenu();
  }

  // ==== КОРЗИНА (cart.html) ====
  const cartDiv = document.getElementById('cartItems');
  if (cartDiv) {
    if (!requireAuth()) return;

    document.getElementById('menuBtn').addEventListener('click', () => window.location.href = 'index.html');
    const payBtn = document.getElementById('payBtn');

    async function loadCart() {
      cartDiv.innerHTML = '<p>Загрузка корзины...</p>';
      payBtn.disabled = true;
      const res = await fetchWithAuth('/cart');
      if (!res.ok) {
        cartDiv.innerHTML = '<p class="error">Ошибка загрузки корзины.</p>';
        return;
      }
      const cart = await res.json();
      if (cart.length === 0) {
        cartDiv.innerHTML = '<p>Корзина пуста</p>';
        return;
      }

      cartDiv.innerHTML = '';
      let totalSum = 0;
      cart.forEach(item => {
        totalSum += item.total;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
          <span class="cart-item-name">${item.name} (x${item.quantity}) — ${item.total} ₽</span>
          <button class="remove-from-cart-btn" data-id="${item.item_id}">×</button>`;
        cartDiv.appendChild(div);
      });

      const totalDiv = document.createElement('div');
      totalDiv.className = 'cart-total';
      totalDiv.textContent = `Итого: ${totalSum} ₽`;
      cartDiv.appendChild(totalDiv);
      payBtn.disabled = false;
    }

    cartDiv.addEventListener('click', async (e) => {
        if (e.target.classList.contains('remove-from-cart-btn')) {
            const itemId = e.target.dataset.id;
            const res = await fetchWithAuth('/cart/remove', {
                method: 'POST',
                body: JSON.stringify({ item_id: parseInt(itemId) })
            });
            if (res.ok) { loadCart(); }
            const data = await res.json();
            showToast(data.message || data.error, !res.ok);
        }
    });

    payBtn.addEventListener('click', async (e) => {
      e.target.disabled = true;
      e.target.textContent = 'Обработка...';
      const res = await fetchWithAuth('/payment', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.order_id) {
        localStorage.setItem('order_id', data.order_id);
        window.location.href = 'payment.html';
      } else {
        showToast('Ошибка оплаты: ' + (data.error || 'Неизвестная ошибка'), true);
        e.target.disabled = false;
        e.target.textContent = 'Оплатить';
      }
    });
    
    loadCart();
  }

  // ==== ОПЛАТА (payment.html) ====
  const paymentForm = document.getElementById('paymentForm');
  if (paymentForm) {
    if (!requireAuth()) return;

    const orderId = localStorage.getItem("order_id");
    const orderInfo = document.getElementById("orderInfo");

    if (!orderId) {
        orderInfo.textContent = "Ошибка: номер заказа не найден. Возврат на главную...";
        setTimeout(() => window.location.href = "index.html", 2500);
    } else {
        orderInfo.textContent = `Оплата заказа №${orderId}`;
        paymentForm.style.display = 'flex';
    }

    document.getElementById("cancelBtn").addEventListener("click", () => {
        localStorage.removeItem("order_id");
        window.location.href = "index.html";
    });

    paymentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        showToast("✅ Оплата прошла успешно! Возвращаемся в меню...");
        setTimeout(() => {
            localStorage.removeItem("order_id");
            window.location.href = "index.html";
        }, 2500);
    });
  }
});