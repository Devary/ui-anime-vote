describe('Open content editing with moderation', () => {
  const openManagementTab = (tab: string) => {
    cy.get('.admin-btn').click();
    cy.contains('button', tab).click();
  };

  const createAnime = (name: string) => {
    cy.contains('button', 'Add Anime').click();
    cy.get('app-crud-modal input').first().clear().type(name);
    cy.contains('app-crud-modal button', 'Create').click();
    cy.contains('.dialog button', 'Confirm').click();
  };

  it('simple users can access the Anime and Characters tabs, Users stays admin-only', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'Anime').should('exist');
    cy.contains('button', 'Characters').should('exist');
    cy.contains('button', 'Users').should('not.exist');
  });

  it('a user-created anime is submitted for moderation and listed as PENDING', () => {
    const name = 'Cy Anime ' + Date.now().toString(36);
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    openManagementTab('Anime');
    createAnime(name);
    cy.contains('.toast', 'Submitted for moderation').should('be.visible');
    cy.contains('tr', name).find('.pending-chip').should('contain.text', 'PENDING');
  });

  it('creating a duplicate anime offers to modify the existing one instead', () => {
    const name = 'Cy Dup ' + Date.now().toString(36);
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    openManagementTab('Anime');

    createAnime(name);
    cy.contains('.toast', 'Submitted for moderation').should('be.visible');

    // same name (different case) → duplicate modal offering to edit
    createAnime(name.toUpperCase());
    cy.contains('.dialog .title', 'Already exists').should('be.visible');
    cy.contains('.dialog .message', 'Do you want to modify it instead?').should('be.visible');
    cy.contains('.dialog button', 'Confirm').click();

    // the form switched to editing the existing anime
    cy.contains('app-crud-modal', 'Edit Anime').should('exist');
    cy.get('app-crud-modal input').first().should('have.value', name);
  });

  it('duplicating a seeded character also triggers the modify-it modal', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    openManagementTab('Characters');
    cy.contains('button', 'Add Character').click();
    cy.get('input[name="cname"]').type('Monkey D. Luffy');
    cy.get('app-crud-modal p-select input').first().clear().type('One Piece');
    cy.contains('app-crud-modal button', 'Create').click();
    cy.contains('.dialog button', 'Confirm').click();
    cy.contains('.dialog .title', 'Already exists', { timeout: 10000 }).should('be.visible');
  });

  it('simple users see no delete buttons on anime rows', () => {
    const name = 'Cy NoDel ' + Date.now().toString(36);
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    openManagementTab('Anime');
    createAnime(name);
    cy.contains('tr', name).should('exist');
    cy.get('button[title="Delete"]').should('not.exist');
  });
});
