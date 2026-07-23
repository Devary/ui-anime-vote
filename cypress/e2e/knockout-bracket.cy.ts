describe('Knockout bracket (multi-group multi-poll)', () => {
  const openTournament = () =>
    cy.freshUserSession().then(session =>
      cy.request('/api/multi-polls').then(({ body }) => {
        const bracket = body.find((mp: any) =>
          mp.groups.some((g: any) => g.level > 0));
        expect(bracket, 'a bracket tournament must be seeded').to.exist;
        cy.visitWithSession(session, `/?p=${bracket.id}`);
        cy.get('app-multi-poll-card .bkt-tree', { timeout: 15000 }).should('exist');
      }));

  it('renders the symmetric tree with a gold Final and TBD shields', () => {
    openTournament();
    cy.get('.bkt-match.final').should('exist');
    cy.get('.final-label').should('contain.text', 'Final');
    cy.get('.bkt-shield').should('have.length.at.least', 4); // semis + final are undecided
    cy.get('.bkt-children.pane').should('have.length', 2);   // mirrored sides
  });

  it('opens a match sheet, votes once per group, then switches the vote', () => {
    openTournament();
    cy.get('.bkt-match.match-open.clickable').first().click();
    cy.get('.vote-sheet').should('be.visible');

    // vote for the first candidate
    cy.get('.sheet-row:not(:disabled)').first().click();
    cy.get('.sheet-row.is-my-vote').should('have.length', 1);
    cy.get('.sheet-row.is-my-vote').should('be.disabled');

    // one vote per group — but switching to another candidate is allowed while open
    cy.get('.sheet-row.is-my-vote .row-name').invoke('text').then(firstPick => {
      cy.get('.sheet-row:not(:disabled)').first().click();
      cy.get('.sheet-row.is-my-vote .row-name').should($el => {
        expect($el.text().trim()).not.to.eq(firstPick.trim());
      });
    });
  });

  it('TBD matches are not clickable', () => {
    openTournament();
    cy.get('.bkt-match.match-tbd').first().click({ force: true });
    cy.get('.vote-sheet').should('not.exist');
  });
});
