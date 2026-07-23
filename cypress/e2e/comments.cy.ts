describe('Comments and likes (TikTok action rail)', () => {
  it('the action rail shows like, comment and share bottom-right', () => {
    cy.visit('/');
    cy.get('.action-rail', { timeout: 15000 }).should('be.visible');
    cy.get('.action-rail .like-btn').should('exist');
    cy.get('.action-rail .comment-btn').should('exist');
    cy.get('.action-rail .share-btn').should('exist');
  });

  it('liking toggles the heart and the count', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.like-btn .rail-count', { timeout: 15000 }).invoke('text').then(before => {
      const n = parseInt(before.trim(), 10);
      cy.get('.like-btn').click();
      cy.get('.like-btn').should('have.class', 'liked');
      cy.get('.like-btn .rail-count').should('contain.text', String(n + 1));
      cy.get('.like-btn').click();
      cy.get('.like-btn').should('not.have.class', 'liked');
    });
  });

  it('authenticated users can post text comments (newest first)', () => {
    const text = 'Cypress says hi ' + Date.now().toString(36);
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.comment-btn', { timeout: 15000 }).click();
    cy.get('.drawer').should('be.visible');
    cy.get('.composer-input').type(text);
    cy.get('.composer-post').click();
    cy.get('.comment').first().should('contain.text', text);
    cy.get('.comment-btn .rail-count').should($el => {
      expect(parseInt($el.text(), 10)).to.be.greaterThan(0);
    });
  });

  it('rejects links client-side with a clear error', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.comment-btn', { timeout: 15000 }).click();
    cy.get('.composer-input').type('check www.spam.com now');
    cy.get('.composer-post').click();
    cy.get('.composer-error').should('contain.text', 'Links are not allowed');
    cy.get('.comment').should('not.contain.text', 'spam.com');
  });

  it('anonymous visitors can read but are asked to sign in to write', () => {
    cy.visit('/');
    cy.get('.comment-btn', { timeout: 15000 }).click();
    cy.get('.drawer').should('be.visible');
    cy.get('.sign-in-note').should('exist');
    cy.get('.composer-input').should('not.exist');
  });

  it('the creator can disable comments; the UI says so and blocks new ones', () => {
    // creator makes a private poll (visible to them in the feed) and opens it
    cy.freshUserSession().then(session => {
      cy.request({
        method: 'POST', url: '/api/user/polls',
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: { question: 'cmt ui ' + Date.now().toString(36) + '?', anime: 'x',
                fighterIds: ['luffy', 'zoro'], visibility: 'PRIVATE' },
      }).then(({ body }) => {
        cy.visitWithSession(session, `/?p=${body.id}`);
        cy.get('.comment-btn', { timeout: 15000 }).click();
        cy.get('.toggle-btn').should('be.visible').click(); // creator-only control
        cy.get('.disabled-note').should('be.visible');
        cy.get('.composer-input').should('not.exist');
        // and back on
        cy.get('.toggle-btn').click();
        cy.get('.disabled-note').should('not.exist');
        cy.get('.composer-input').should('exist');
      });
    });
  });
});
