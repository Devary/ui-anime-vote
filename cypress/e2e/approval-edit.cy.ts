describe('Edit before approving', () => {
  it('a moderator can fix a pending anime from the approval queue and publish it', () => {
    const name = 'Cy Pending ' + Date.now().toString(36);
    const fixed = name + ' fixed';

    // a simple user submits an anime (goes to the moderation queue)
    cy.freshUserSession().then(user => {
      cy.request({
        method: 'POST',
        url: '/api/user/anime',
        headers: { Authorization: `Bearer ${user.accessToken}` },
        body: { name, imageUrl: '' },
      }).its('body.status').should('eq', 'PENDING');
    });

    // the moderator edits it in the Approvals tab before approving
    cy.apiLogin('mod', 'mod12345').then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'Approvals').click();
    cy.contains('.approval-row', name).within(() => {
      cy.contains('button', 'Edit').click();
    });
    cy.get('app-crud-modal input').first().clear().type(fixed);
    cy.contains('app-crud-modal button', 'Save & Approve').click();
    cy.contains('.dialog button', 'Confirm').click();

    cy.contains('.toast', 'Changes saved').should('be.visible');
    cy.contains('.toast', 'Approved').should('be.visible');
    cy.contains('.approval-row', name).should('not.exist');

    // published under the corrected name
    cy.request('/api/admin/anime').its('body').should(list => {
      expect(list.map((a: any) => a.name)).to.include(fixed);
    });
  });
});
