describe('Vote-by-group polls', () => {
  const openGroupVotePoll = () =>
    cy.freshUserSession().then(session =>
      cy.request('/api/multi-polls').then(({ body }) => {
        const gp = body.find((mp: any) => mp.votingByGroup === true);
        expect(gp, 'a vote-by-group poll must be seeded').to.exist;
        cy.visitWithSession(session, `/?p=${gp.id}`);
        cy.get('.choice-board', { timeout: 15000 }).should('be.visible');
        return cy.wrap(gp);
      }));

  it('renders groups as selectable choices with their rosters', () => {
    openGroupVotePoll().then((gp: any) => {
      cy.get('.choice-card').should('have.length', gp.groups.length);
      cy.contains('.multi-badge', 'GROUP VOTE').should('exist');
      cy.get('.choice-card').first().find('.choice-avatar').should('have.length.at.least', 1);
      // no per-character voting UI in this mode
      cy.get('.bkt-tree').should('not.exist');
      cy.get('.winner-node').should('not.exist');
    });
  });

  it('votes for a whole group, shows results, then switches', () => {
    openGroupVotePoll();
    cy.get('.choice-card').first().click();
    cy.get('.choice-card').first().should('have.class', 'is-my-choice');
    cy.get('.choice-card').first().find('.choice-meta').should('contain.text', '%');

    // switching to another group while open
    cy.get('.choice-card').eq(1).click();
    cy.get('.choice-card').eq(1).should('have.class', 'is-my-choice');
    cy.get('.choice-card').first().should('not.have.class', 'is-my-choice');
  });

  it('ten group-vote and ten character-vote polls are seeded', () => {
    cy.request('/api/multi-polls').its('body').then(body => {
      const byGroup = body.filter((m: any) => m.votingByGroup === true).length;
      expect(byGroup).to.be.gte(10);
      expect(body.length - byGroup).to.be.gte(8); // members-only/unstarted hidden from anonymous
    });
  });
});
