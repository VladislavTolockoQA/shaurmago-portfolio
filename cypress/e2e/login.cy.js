describe('Проверка страницы входа', () => {
  // хук beforeEach, чтобы не повторять cy.visit() в каждом тесте.
  // Этот блок будет выполняться перед каждым 'it'.
  beforeEach(() => {
    cy.visit('/frontend/login.html');
  });

  // --- ПОЗИТИВНЫЙ ТЕСТ ---
  it('Позитивная проверка: успешный вход с корректными данными', () => {
    // Данные пользователя, который гарантированно существует в БД
    const userEmail = `test@example.com`;
    const userPassword = 'TestPassword123!';

    cy.log('Проверка наличие всех ключевых элементов на странице');
    cy.contains('h2', 'Вход').should('be.visible');
    cy.get('#email').should('be.visible');
    cy.get('#password').should('be.visible');
    cy.contains('button', 'Войти').should('be.visible');
    cy.get('a[href="register.html"]').should('be.visible');
    
    cy.log('Вводим корректные данные и логинимся');
    cy.get('#email').type(userEmail);
    cy.get('#password').type(userPassword);
    cy.get('form').submit();

    cy.log('Проверка, что вход успешен и мы на главной странице');
    cy.location('pathname').should('eq', '/frontend/index.html');
    cy.contains('.title', 'ShaurmaGo — Меню').should('be.visible');
    cy.contains('.menu-item', 'Шаурма классическая').should('be.visible');
  });

  // --- НЕГАТИВНЫЙ ТЕСТ №1 ---
  it('Негативная проверка: отображение ошибки при вводе неверного пароля', () => {
    const userEmail = `tester@shaurma.com`;
    const wrongPassword = 'WrongPassword123!';

    cy.log('Вводим данные с неверным паролем');
    cy.get('#email').type(userEmail);
    cy.get('#password').type(wrongPassword);
    
    // 1. Сначала настраиваем перехватчик
    cy.intercept('POST', '/api/login').as('loginAttempt');
    
    // 2. Затем отправляем форму
    cy.get('form').submit();

    // 3. Ждем ответа от сервера и проверяем статус
    cy.wait('@loginAttempt').its('response.statusCode').should('eq', 401);

    cy.log('Проверяем, что появилось уведомление об ошибке');
    cy.get('.toast-notification.error')
      .should('be.visible')
      .and('contain', 'Неверный email или пароль');

    cy.log('Проверяем, что мы остались на странице входа');
    cy.location('pathname').should('eq', '/frontend/login.html');
  });

  // --- НЕГАТИВНЫЙ ТЕСТ №2 ---
  it('Негативная проверка: отображение ошибки при вводе несуществующего email', () => {
    // Генерируем email, которого точно нет в базе
    const nonExistentEmail = `nonexistent_${Date.now()}@shaurma.com`;
    const userPassword = 'TestPassword123!';

    cy.log('Вводим несуществующие данные');
    cy.get('#email').type(nonExistentEmail);
    cy.get('#password').type(userPassword);
    
    // 1. Настраиваем перехватчик
    cy.intercept('POST', '/api/login').as('loginAttempt');
    
    // 2. Отправляем форму
    cy.get('form').submit();

    // 3. Ждем ответа и проверяем статус
    cy.wait('@loginAttempt').its('response.statusCode').should('eq', 401);

    cy.log('Проверяем, что появилось уведомление об ошибке');
    cy.get('.toast-notification.error')
      .should('be.visible')
      .and('contain', 'Неверный email или пароль');

    cy.log('Проверяем, что мы остались на странице входа');
    cy.location('pathname').should('eq', '/frontend/login.html');
  });
});