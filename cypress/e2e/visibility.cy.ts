describe('Poll visibility and moderation roles', () => {
  it('anonymous users only receive public polls', () => {
    cy.request('/api/polls').then(({ body }) => {
      expect(body.length).to.be.greaterThan(0);
      body.forEach((p: any) => expect(p.visibility).to.eq('PUBLIC'));
    });
  });

  it('authenticated users also receive the members-only poll', () => {
    cy.freshUserSession().then(session => {
      cy.request({
        url: '/api/polls',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      }).then(({ body }) => {
        const members = body.find((p: any) => p.visibility === 'AUTHENTICATED');
        expect(members, 'members-only poll must be listed for authenticated users').to.exist;
      });
    });
  });

  it('the restricted poll is visible to its audience (otaku) but not to strangers', () => {
    cy.apiLogin('otaku', 'otaku123').then(otaku => {
      cy.request({
        url: '/api/polls',
        headers: { Authorization: `Bearer ${otaku.accessToken}` },
      }).its('body').then(body => {
        expect(body.some((p: any) => p.visibility === 'RESTRICTED')).to.be.true;
      });
    });
    cy.freshUserSession().then(stranger => {
      cy.request({
        url: '/api/polls',
        headers: { Authorization: `Bearer ${stranger.accessToken}` },
      }).its('body').then(body => {
        expect(body.some((p: any) => p.visibility === 'RESTRICTED')).to.be.false;
      });
    });
  });

  it('the visibility selector shows the audience picker for RESTRICTED', () => {
    cy.apiLogin('otaku', 'otaku123').then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'My Content').click();
    cy.contains('button', 'Polls').click();
    cy.contains('button', '+ New Poll').click();
    cy.get('app-visibility-field select').should('exist').select('RESTRICTED');
    cy.get('.audience-box').should('be.visible');
    cy.get('.audience-item').should('have.length.at.least', 2);
    cy.contains('.audience-item', 'admin').should('exist');
  });

  it('moderators see content tabs but not the Users tab', () => {
    cy.apiLogin('mod', 'mod12345').then(s => cy.visitWithSession(s));
    cy.get('.admin-btn').click();
    cy.contains('button', 'Approvals').should('exist');
    cy.contains('button', 'Multi-Polls').should('exist');
    cy.contains('button', 'Users').should('not.exist');
  });
});
