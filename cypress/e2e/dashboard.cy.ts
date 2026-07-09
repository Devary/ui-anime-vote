describe('Analytics dashboard', () => {
  const loginAsAdmin = () => {
    cy.visit('/');
    cy.contains('.login-btn', /Login/i).click();
    cy.get('input').eq(0).type('admin');
    cy.get('input').eq(1).type('admin123');
    cy.contains('button', 'Sign in').click();
  };

  it('shows platform totals and rankings to admins/moderators', () => {
    loginAsAdmin();
    cy.get('.admin-btn', { timeout: 10000 }).click();
    cy.contains('.nav-item', 'Dashboard').click();

    cy.get('.kpi-card', { timeout: 10000 }).should('have.length.greaterThan', 5);
    cy.contains('.kpi-label', 'Users').parent().find('.kpi-value').invoke('text').then(v => {
      expect(parseInt(v.replace(/,/g, ''), 10)).to.be.gte(1);
    });
    cy.contains('.kpi-label', 'Multi-Polls').parent().find('.kpi-value').invoke('text').then(v => expect(parseInt(v.replace(/,/g, ''), 10)).to.be.gte(20));
    cy.contains('.kpi-label', 'Polls').parent().find('.kpi-value').invoke('text').then(v => expect(parseInt(v.replace(/,/g, ''), 10)).to.be.gte(10));

    cy.contains('.breakdown-title', 'Multi-Poll voting mode').should('exist');
    cy.contains('.ranking-title', 'Most Voted').parent().find('.ranking-row').should('have.length.greaterThan', 0);
  });

  it('the nav is hidden from simple users', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.admin-btn', { timeout: 10000 }).click();
    cy.contains('.nav-item', 'Dashboard').should('not.exist');
  });

  it('refresh reloads the data', () => {
    loginAsAdmin();
    cy.get('.admin-btn', { timeout: 10000 }).click();
    cy.contains('.nav-item', 'Dashboard').click();
    cy.get('.kpi-card', { timeout: 10000 }).should('exist');
    cy.contains('button', '↻ Refresh').click();
    cy.get('.kpi-card').should('exist');
  });
});
