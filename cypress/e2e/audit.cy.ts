describe('Audit trail and version restore', () => {
  it('cards show who created the poll', () => {
    cy.visit('/');
    cy.get('.owner-chip', { timeout: 15000 })
      .should('be.visible')
      .and('contain.text', 'by :');
  });

  it('moderators see lifecycle events and can restore an earlier version', () => {
    const original = 'Cy Audit ' + Date.now().toString(36);

    // a user creates then renames an anime through the API
    cy.freshUserSession().then(user => {
      cy.request({
        method: 'POST', url: '/api/user/anime',
        headers: { Authorization: `Bearer ${user.accessToken}` },
        body: { name: original, imageUrl: '' },
      }).then(({ body }) => {
        cy.request({
          method: 'PUT', url: `/api/user/anime/${body.id}`,
          headers: { Authorization: `Bearer ${user.accessToken}` },
          body: { name: original + ' renamed', imageUrl: '' },
        });
      });
    });

    // the moderator reviews the trail and restores the original version
    cy.apiLogin('mod', 'mod12345').then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'Audit').click();

    cy.contains('.audit-row', original + ' renamed').should('exist');
    cy.contains('.audit-row', original + ' renamed').find('.action-badge')
      .should('contain.text', 'UPDATED');

    // the CREATED row still holds the original name — restore it
    cy.get('.audit-row').filter((_, el) => {
      return el.textContent!.includes('CREATED') && el.textContent!.includes(original)
        && !el.textContent!.includes('renamed');
    }).first().find('.btn-restore').click();
    cy.contains('.dialog button', 'Confirm').click();

    cy.contains('.toast', 'Version restored').should('be.visible');
    cy.get('.audit-row').first().find('.action-badge').should('contain.text', 'RESTORED');
  });

  it('simple users have no Audit tab', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'My Content').should('exist');
    cy.contains('button', 'Audit').should('not.exist');
  });
});
