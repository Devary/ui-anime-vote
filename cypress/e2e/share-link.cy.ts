describe('Shareable poll links', () => {
  it('public cards expose a share button that yields the deep link', () => {
    cy.visit('/');
    cy.get('.share-btn', { timeout: 15000 }).should('exist').click();
    // Web Share API is unavailable headless → clipboard success or URL-info toast
    cy.get('.toast').should('exist');
  });

  it('a shared ?p= link opens the app directly on that poll', () => {
    cy.request('/api/multi-polls').then(({ body }) => {
      const bracket = body.find((mp: any) => mp.groups.some((g: any) => g.level > 0));
      cy.visit(`/?p=${bracket.id}`);
      cy.get('app-multi-poll-card .poll-question', { timeout: 15000 })
        .should('contain.text', bracket.question);
    });
  });

  it('deep links to an unknown poll fall back to the first card', () => {
    cy.visit('/?p=does-not-exist');
    cy.get('.poll-question', { timeout: 15000 }).should('exist');
  });
});
