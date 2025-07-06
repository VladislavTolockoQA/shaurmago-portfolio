Cypress.Commands.add('login', (email, password) => {
  cy.visit('/frontend/login.html');
  cy.get('#email').type(email);
  cy.get('#password').type(password);
  cy.get('form').submit();
  cy.url().should('include', '/frontend/index.html'); // Убедимся, что вошли
});