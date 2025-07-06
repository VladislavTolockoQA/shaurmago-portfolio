# --- Файл: app.py (ОБНОВЛЕН) ---

import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import re
import jwt
from datetime import datetime, timedelta
from functools import wraps
from dotenv import load_dotenv

# --- Конфигурация ---
load_dotenv() # Загружаем переменные из .env файла

app = Flask(__name__)
CORS(app) # Разрешаем CORS для всех доменов
basedir = os.path.abspath(os.path.dirname(__file__))

# Используем переменные окружения для конфигурации
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///' + os.path.join(basedir, 'shaurma.db'))
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# --- Модели Базы Данных ---
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    cart_items = db.relationship('CartItem', backref='user', lazy=True, cascade="all, delete-orphan")
    orders = db.relationship('Order', backref='user', lazy=True)

class Menu(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    img = db.Column(db.String(200), nullable=False)

    def to_dict(self):
        return {"id": self.id, "name": self.name, "price": self.price, "img": self.img}

class CartItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    item_id = db.Column(db.Integer, db.ForeignKey('menu.id'), nullable=False)
    quantity = db.Column(db.Integer, default=1, nullable=False)
    item = db.relationship('Menu')

# НОВЫЕ МОДЕЛИ для истории заказов
class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    total_price = db.Column(db.Integer, nullable=False)
    items = db.relationship('OrderItem', backref='order', lazy=True, cascade="all, delete-orphan")

class OrderItem(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey('order.id'), nullable=False)
    menu_item_name = db.Column(db.String(100), nullable=False)
    price = db.Column(db.Integer, nullable=False)
    quantity = db.Column(db.Integer, nullable=False)


# --- Декоратор для проверки JWT токена ---
def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith('Bearer '):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'error': 'Токен аутентификации отсутствует'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'Пользователь не найден'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Срок действия токена истек'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Неверный токен'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

# --- Валидация пароля ---
def valid_password(pwd):
    return (len(pwd) >= 8 and
            re.search(r'[A-Z]', pwd) and
            re.search(r'\d', pwd) and
            re.search(r'[^A-Za-z0-9]', pwd))

# --- Роуты API (с префиксом /api) ---
API_PREFIX = '/api'

@app.route(f"{API_PREFIX}/register", methods=["POST"])
def register():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Заполните все поля"}), 400
    if not valid_password(password):
        return jsonify({"error": "Пароль должен быть не менее 8 символов, содержать заглавную букву, цифру и спецсимвол"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Пользователь с таким email уже существует"}), 409

    hashed_password = generate_password_hash(password, method='pbkdf2:sha256')
    new_user = User(email=email, password_hash=hashed_password)
    db.session.add(new_user)
    db.session.commit()

    return jsonify({"message": "Registration successful"}), 201

@app.route(f"{API_PREFIX}/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "Неверный email или пароль"}), 401

    token = jwt.encode({
        'user_id': user.id,
        'exp': datetime.utcnow() + timedelta(hours=24)
    }, app.config['SECRET_KEY'], algorithm="HS256")

    return jsonify({"message": "Login successful", "token": token})

@app.route(f"{API_PREFIX}/menu", methods=["GET"])
@token_required
def get_menu(current_user): # Добавили current_user для единообразия
    menu_items = Menu.query.all()
    return jsonify([item.to_dict() for item in menu_items])

@app.route(f"{API_PREFIX}/cart", methods=["GET"])
@token_required
def get_cart(current_user):
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    detailed_cart = []
    for ci in cart_items:
        detailed_cart.append({
            "cart_item_id": ci.id, # Отдаем ID элемента корзины для возможного обновления
            "item_id": ci.item_id,
            "name": ci.item.name,
            "price": ci.item.price,
            "quantity": ci.quantity,
            "img": ci.item.img,
            "total": ci.item.price * ci.quantity
        })
    return jsonify(detailed_cart)

@app.route(f"{API_PREFIX}/cart/add", methods=["POST"])
@token_required
def add_to_cart(current_user):
    data = request.get_json()
    item_id = data.get("item_id")
    quantity = data.get("quantity", 1)

    if not item_id or not isinstance(quantity, int) or quantity <= 0:
        return jsonify({"error": "Неверные данные"}), 400

    item = Menu.query.get(item_id)
    if not item:
        return jsonify({"error": "Товар не найден"}), 404

    cart_item = CartItem.query.filter_by(user_id=current_user.id, item_id=item_id).first()
    if cart_item:
        cart_item.quantity += quantity
    else:
        cart_item = CartItem(user_id=current_user.id, item_id=item_id, quantity=quantity)
        db.session.add(cart_item)
    
    db.session.commit()
    return jsonify({"message": f"Товар '{item.name}' добавлен в корзину"})

@app.route(f"{API_PREFIX}/cart/remove", methods=["POST"])
@token_required
def remove_from_cart(current_user):
    data = request.get_json()
    item_id = data.get("item_id")
    if not item_id:
        return jsonify({"error": "Не указан ID товара"}), 400

    cart_item = CartItem.query.filter_by(user_id=current_user.id, item_id=item_id).first()
    if cart_item:
        db.session.delete(cart_item)
        db.session.commit()
        return jsonify({"message": "Товар удален из корзины"})
    return jsonify({"error": "Товар не найден в корзине"}), 404

# ОБНОВЛЕННЫЙ РОУТ ОПЛАТЫ
@app.route(f"{API_PREFIX}/payment", methods=["POST"])
@token_required
def payment(current_user):
    cart_items = CartItem.query.filter_by(user_id=current_user.id).all()
    if not cart_items:
        return jsonify({"error": "Корзина пуста"}), 400

    total_price = sum(ci.item.price * ci.quantity for ci in cart_items)
    
    # 1. Создаем новый заказ
    new_order = Order(user_id=current_user.id, total_price=total_price)
    db.session.add(new_order)
    
    # 2. Переносим товары из корзины в детали заказа
    for ci in cart_items:
        order_item = OrderItem(
            order=new_order,
            menu_item_name=ci.item.name,
            price=ci.item.price,
            quantity=ci.quantity
        )
        db.session.add(order_item)

    # 3. Очищаем корзину
    CartItem.query.filter_by(user_id=current_user.id).delete()
    
    # 4. Сохраняем все изменения в БД
    db.session.commit()

    return jsonify({"message": "Payment successful, order created", "order_id": new_order.id})

# НОВЫЙ РОУТ ДЛЯ ТЕСТИРОВАНИЯ ОШИБОК
@app.route(f"{API_PREFIX}/force-error", methods=["GET"])
@token_required
def force_error(current_user):
    try:
        # Симулируем непредвиденную ошибку
        result = 1 / 0
    except Exception as e:
        # В реальном приложении здесь было бы логирование ошибки в Sentry, Loki и т.д.
        app.logger.error(f"Forced error triggered by user {current_user.email}: {e}")
        # Возвращаем стандартный ответ сервера при внутренней ошибке
        return jsonify({"error": "Произошла внутренняя ошибка сервера. Мы уже работаем над этим!"}), 500

# --- Команда для инициализации БД ---
@app.cli.command("init-db")
def init_db_command():
    """Создает таблицы и наполняет меню."""
    db.create_all()
    if Menu.query.first() is None:
        menu_items = [
            Menu(name="Шаурма классическая", price=250, img="images/shaurma1.jpg"),
            Menu(name="Шаурма с сыром", price=300, img="images/shaurma2.jpg"),
            Menu(name="Шаурма XXL", price=400, img="images/shaurma3.jpg"),
            Menu(name="Гипермега шаурма", price=2000, img="images/shaurma4.jpg"),
            Menu(name="Шаурма Вегетарианская", price=320, img="images/shaurma_veg.jpg")
        ]
        db.session.bulk_save_objects(menu_items)
        db.session.commit()
        print("База данных инициализирована и наполнена меню.")
    else:
        print("Меню уже существует. Пропуск наполнения.")

if __name__ == "__main__":
    app.run(debug=True, port=5000)