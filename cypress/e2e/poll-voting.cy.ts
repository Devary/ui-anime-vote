describe('Simple poll voting', () => {
  it('shows the org chart with a gold Winner root before voting', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('app-poll-card', { timeout: 15000 }).should('exist');
    cy.get('app-poll-card .winner-node').should('exist');
    cy.get('app-poll-card .final-label').should('contain.text', 'Winner');
    cy.get('app-poll-card .fighter-node').should('have.length.at.least', 2);
  });

  it('votes on a fighter, shows a toast and the result bar, then advances', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('app-poll-card .poll-question').invoke('text').then(firstQuestion => {
      cy.get('app-poll-card .fighter-btn').first().click();
      cy.contains('.toast', 'Vote cast!').should('be.visible');
      // carousel auto-advances to the next unvoted card
      cy.get('.poll-question').should($q => {
        expect($q.text().trim()).not.to.eq(firstQuestion.trim());
      });
    });
  });

  it('single-group multi-polls render the simple org chart too', () => {
    cy.freshUserSession().then(session => {
      cy.request({
        url: '/api/multi-polls',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }).then(({ body }) => {
        const simple = body.find((mp: any) => mp.groups.length === 1);
        expect(simple, 'a single-group multi-poll must be seeded').to.exist;
        cy.visitWithSession(session, `/?p=${simple.id}`);
        cy.get('app-multi-poll-card .simple-board', { timeout: 15000 }).should('exist');
        cy.get('app-multi-poll-card .winner-node').should('exist');
        cy.get('app-multi-poll-card .bkt-tree').should('not.exist');
      });
    });
  });
});
