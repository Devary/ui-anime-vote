describe('Internationalisation (EN / FR / AR)', () => {
  const pickLanguage = (label: string) => {
    cy.get('.lang-toggle').click();
    cy.contains('.lang-option', label).click();
  };

  it('the flag dropdown switches languages and flips Arabic to RTL', () => {
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('anime_lang', 'en') });
    cy.contains('.login-btn', 'Login').should('exist');
    cy.get('html').should('have.attr', 'dir', 'ltr');
    cy.get('.lang-toggle .lang-flag').should('contain.text', '🇺🇸');

    pickLanguage('Français');
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.get('html').should('have.attr', 'lang', 'fr');
    cy.get('.lang-toggle .lang-flag').should('contain.text', '🇫🇷');

    pickLanguage('العربية');
    cy.contains('.login-btn', 'تسجيل الدخول').should('exist');
    cy.get('html').should('have.attr', 'dir', 'rtl');
    cy.get('.lang-toggle .lang-flag').should('contain.text', '🇹🇳');

    pickLanguage('English (US)');
    cy.contains('.login-btn', 'Login').should('exist');
    cy.get('html').should('have.attr', 'dir', 'ltr');
  });

  it('the dropdown lists all three languages with their flags', () => {
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('anime_lang', 'en') });
    cy.get('.lang-toggle').click();
    cy.get('.lang-option').should('have.length', 3);
    cy.contains('.lang-option', 'English (US)').should('contain.text', '🇺🇸');
    cy.contains('.lang-option', 'Français').should('contain.text', '🇫🇷');
    cy.contains('.lang-option', 'العربية').should('contain.text', '🇹🇳');
  });

  it('persists the chosen language across reloads', () => {
    cy.visit('/', { onBeforeLoad: w => w.localStorage.setItem('anime_lang', 'en') });
    cy.get('.lang-toggle').click();
    cy.contains('.lang-option', 'Français').click();
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.reload();
    cy.contains('.login-btn', 'Connexion').should('exist');
    cy.get('html').should('have.attr', 'lang', 'fr');
  });
});
