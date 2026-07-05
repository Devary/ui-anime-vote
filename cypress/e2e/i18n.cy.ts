describe('Internationalisation (EN / FR / AR)', () => {
  it('cycles languages and flips Arabic to RTL', () => {
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('anime_lang', 'en') });
    cy.contains('.login-btn', 'Login').should('exist');
    cy.get('html').should('have.attr', 'dir', 'ltr');

    cy.get('.lang-toggle').click(); // → FR
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.get('html').should('have.attr', 'lang', 'fr');
    cy.get('html').should('have.attr', 'dir', 'ltr');

    cy.get('.lang-toggle').click(); // → AR
    cy.contains('.login-btn', 'تسجيل الدخول').should('exist');
    cy.get('html').should('have.attr', 'dir', 'rtl');

    cy.get('.lang-toggle').click(); // → EN again
    cy.contains('.login-btn', 'Login').should('exist');
    cy.get('html').should('have.attr', 'dir', 'ltr');
  });

  it('persists the chosen language across reloads', () => {
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('anime_lang', 'en') });
    cy.get('.lang-toggle').click(); // FR, persisted
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.reload();
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.get('html').should('have.attr', 'lang', 'fr');
  });
});
