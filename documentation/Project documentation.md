Техническая документация проекта "ShaurmaGo"
1. Обзор проекта и архитектура
ShaurmaGo — это веб-приложение, реализованное по клиент-серверной архитектуре.
Бэкенд (Backend):
Технологии: Python, Flask, SQLAlchemy.
Назначение: Предоставляет REST API для управления данными: пользователями, сессиями, меню, корзиной и заказами. Отвечает за всю бизнес-логику и взаимодействие с базой данных.
База данных: SQLite.
Фронтенд (Frontend):
Технологии: HTML, CSS, нативный JavaScript (ES6+).
Назначение: Является "тонким клиентом". Отвечает за отображение данных, полученных от API, и отправку запросов на бэкенд при взаимодействии с пользователем. Вся логика реализована в файле scripts.js.
2. Функциональные возможности
2.1. Аутентификация
Регистрация: Пользователи могут создать новый аккаунт, указав email и пароль. Пароль должен соответствовать требованиям безопасности (длина, наличие заглавной буквы, цифры и спецсимвола).
Вход в систему: Аутентификация происходит по паре email/пароль. В случае успеха сервер возвращает JWT (JSON Web Token).
Управление сессией: JWT токен сохраняется в localStorage на клиенте и отправляется с каждым последующим запросом в заголовке Authorization: Bearer <token>. Токен имеет ограниченный срок действия (24 часа).
2.2. Меню
После авторизации пользователь получает доступ к списку доступных товаров.
Каждый товар имеет название, цену и изображение. Данные загружаются с бэкенда.
2.3. Корзина
Пользователь может добавлять любой товар из меню в свою персональную корзину.
При повторном добавлении того же товара его количество в корзине увеличивается.
Пользователь может просматривать содержимое корзины, где отображается список товаров, их количество и общая итоговая сумма.
Любую позицию можно полностью удалить из корзины.
2.4. Оформление заказа и оплата
Из корзины пользователь может перейти на страницу оплаты.
Процесс оплаты симулирован: пользователь вводит данные карты, но реальная транзакция не происходит.
После успешного "подтверждения оплаты" на бэкенде происходит следующее:
Создается новая запись в таблице orders с деталями заказа.
Корзина текущего пользователя полностью очищается.
Клиенту возвращается уникальный номер заказа.
3. Документация API (/api)
Все запросы к API должны отправляться на http://<ваш_хост>/api. Для защищенных роутов требуется заголовок Authorization: Bearer <token>.
Аутентификация
POST /api/register
Описание: Регистрирует нового пользователя.
Тело запроса (JSON): { "email": "user@example.com", "password": "StrongPassword1!" }
Успешный ответ (201): { "message": "Registration successful" }
Ошибки: 400 (не все поля, невалидный пароль), 409 (пользователь существует).
POST /api/login
Описание: Аутентифицирует пользователя и возвращает JWT токен.
Тело запроса (JSON): { "email": "user@example.com", "password": "StrongPassword1!" }
Успешный ответ (200): { "message": "Login successful", "token": "ey..." }
Ошибки: 401 (неверный email или пароль).
Меню и Корзина (Требуется аутентификация)
GET /api/menu
Описание: Возвращает все позиции меню.
Успешный ответ (200): Массив объектов, каждый из которых {"id", "name", "price", "img"}.
GET /api/cart
Описание: Возвращает содержимое корзины текущего пользователя.
Успешный ответ (200): Массив объектов, каждый из которых {"cart_item_id", "item_id", "name", "price", "quantity", "img", "total"}.
POST /api/cart/add
Описание: Добавляет товар в корзину или увеличивает его количество.
Тело запроса (JSON): { "item_id": 1, "quantity": 1 }
Успешный ответ (200): { "message": "Товар '...' добавлен в корзину" }
POST /api/cart/remove
Описание: Полностью удаляет позицию из корзины.
Тело запроса (JSON): { "item_id": 1 }
Успешный ответ (200): { "message": "Товар удален из корзины" }
Оплата и Тестирование (Требуется аутентификация)
POST /api/payment
Описание: Симулирует оплату, создает заказ в БД и очищает корзину.
Тело запроса: Не требуется.
Успешный ответ (200): { "message": "Payment successful, order created", "order_id": 123 }
Ошибки: 400 (корзина пуста).
GET /api/force-error
Описание: Специальный роут для тестирования. Всегда возвращает ошибку 500.
Тело запроса: Не требуется.
"Успешный" (ожидаемый) ответ (500): { "error": "Произошла внутренняя ошибка сервера..." }

Примечание: Для более наглядного и интерактивного представления всей тестовой документации, включая тест-план и тест-кейсы, пожалуйста, обратитесь к визуальной доске в Miro.