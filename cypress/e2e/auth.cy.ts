describe('Authentication', () => {
  it('registers a new account through the UI', () => {
    const username = 'ui' + Date.now().toString(36);
    cy.visit('/');
    cy.get('.login-btn').click();
    cy.contains('.tab', 'Register').click();
    cy.get('input[name="ru"]').type(username);
    cy.get('input[name="re"]').type(`${username}@test.local`);
    cy.get('input[name="rp"]').type('Testpass123!');
    cy.get('input[name="rc"]').type('Testpass123!');
    cy.get('.submit-btn').click();
    cy.get('.username-chip').should('contain.text', username);
  });

  it('logs in and out with a seeded user', () => {
    cy.visit('/');
    cy.get('.login-btn').click();
    cy.get('input[name="lu"]').type('otaku');
    cy.get('input[name="lp"]').type('otaku123');
    cy.get('.submit-btn').click();
    cy.get('.username-chip').should('contain.text', 'otaku');
    cy.contains('.login-btn', 'Logout').click();
    cy.contains('.login-btn', 'Login').should('exist');
  });

  it('rejects a wrong password', () => {
    cy.visit('/');
    cy.get('.login-btn').click();
    cy.get('input[name="lu"]').type('otaku');
    cy.get('input[name="lp"]').type('wrong-password');
    cy.get('.submit-btn').click();
    cy.get('.form-error').should('be.visible');
    cy.get('.username-chip').should('not.exist');
  });
});
