// cypress/e2e/e2e_scenarios.cy.js

describe('Сквозные пользовательские сценарии (E2E)', () => {

  beforeEach(() => {
    // Используем хук, чтобы логиниться перед каждым тестом
    cy.login('test@example.com', 'TestPassword123!');
  });

  // --- Тест №1: Полный цикл работы с корзиной (добавление, проверка, удаление) ---
  it('Пользователь может добавить товар в корзину, проверить ее и удалить товар', () => {
    const itemName = 'Шаурма с сыром';
    const itemPrice = 300;

    cy.log('Шаг 1: Находим товар и добавляем в корзину');
    cy.contains('.menu-item', itemName).find('button.add-to-cart-btn').click();

    cy.log('Шаг 2: Проверяем уведомление и переходим в корзину');
    cy.get('.toast-notification').should('be.visible').and('contain', 'добавлен в корзину');
    cy.get('#cartBtn').click();
    cy.location('pathname').should('eq', '/frontend/cart.html');

    cy.log('Шаг 3: Проверяем содержимое корзины');
    cy.get('.cart-item-name').should('contain', itemName);
    cy.get('.cart-item-name').should('contain', '(x1)');
    cy.get('.cart-total').should('contain', `Итого: ${itemPrice} ₽`);

    cy.log('Шаг 4: Находим конкретный товар и удаляем его');
    
    // удаление из корзины
    cy.contains('.cart-item', itemName).find('.remove-from-cart-btn').click();

    cy.log('Шаг 5: Проверяем, что корзина стала пустой');
    // После удаления должен появиться текст "Корзина пуста"
    cy.contains('Корзина пуста').should('be.visible');
    // Проверяем, что блока с итоговой суммой больше нет на странице
    cy.get('.cart-total').should('not.exist');
    // Проверяем, что кнопка "Оплатить" стала неактивной
    cy.get('#payBtn').should('be.disabled');
  });

  // --- Тест №2: Полный цикл "оплаты" (без изменений) ---
  it('Пользователь может "оплатить" заказ и его корзина очищается', () => {
    const item1_name = 'Шаурма классическая';
    const item2_name = 'Шаурма XXL';
    const total_price = 250 + 400;

    cy.log('Шаг 1: Наполняем корзину товарами');
    cy.contains('.menu-item', item1_name).find('button.add-to-cart-btn').click();
    cy.wait(500);
    cy.contains('.menu-item', item2_name).find('button.add-to-cart-btn').click();

    cy.log('Шаг 2: Переходим в корзину и начинаем оплату');
    cy.get('#cartBtn').click();
    cy.location('pathname').should('eq', '/frontend/cart.html');
    cy.get('.cart-total').should('contain', `Итого: ${total_price} ₽`);
    cy.get('#payBtn').click();

    cy.log('Шаг 3: Проверяем страницу оплаты и "подтверждаем"');
    cy.location('pathname').should('eq', '/frontend/payment.html');
    cy.get('#orderInfo').should('not.contain', 'Загрузка');
    
    // Для номера карты: ищем плейсхолдер, который содержит '1234 5678'
    cy.get('input[placeholder*="1234 5678"]').type('1111222233334444');

    // Для срока действия:
    cy.get('input[placeholder*="MM/YY"]').type('12/25');

    // Для CVV: используем точное совпадение плейсхолдера
    cy.get('input[placeholder="123"]').type('123'); //ищем точное совпадение
    
    cy.get('form#paymentForm').submit();

    cy.log('Шаг 4: Проверяем, что нас вернуло на главную страницу');
    cy.location('pathname').should('eq', '/frontend/index.html');
    cy.contains('.title', 'ShaurmaGo — Меню').should('be.visible');

    cy.log('Шаг 5: Проверяем, что корзина теперь пуста');
    cy.get('#cartBtn').click();
    cy.location('pathname').should('eq', '/frontend/cart.html');
    cy.contains('Корзина пуста').should('be.visible');
    cy.get('#payBtn').should('be.disabled');
  });

  // --- Тест №3: Проверка ошибки 500 ---
  it('Проверка корректной обработки ошибки 500', () => {
    cy.intercept('GET', '/api/force-error').as('getError');
    cy.get('#errorBtn').click();
    cy.wait('@getError').its('response.statusCode').should('eq', 500);
    cy.get('.toast-notification.error')
      .should('be.visible')
      .and('contain', 'Получена ожидаемая ошибка');
  });
});