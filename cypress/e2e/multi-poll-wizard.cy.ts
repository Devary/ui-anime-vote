describe('Multi-poll creation wizard (3 steps)', () => {
  const openManagement = () => {
    cy.visit('/');
    cy.contains('.login-btn', /Login/i).click();
    cy.get('input').eq(0).type('admin');
    cy.get('input').eq(1).type('admin123');
    cy.contains('button', 'Sign in').click();
    cy.get('.admin-btn', { timeout: 10000 }).click();
  };

  const fillDateTime = (input: Cypress.Chainable, isoLocal: string) => {
    input.type(isoLocal, { force: true });
  };

  it('walks through Properties → Groups → Summary and creates a multi-poll', () => {
    openManagement();
    cy.contains('.nav-item', 'Multi-Polls').click();
    cy.contains('button', '+ New Multi-Poll').click();

    // ── Step 1: Properties ──────────────────────────────────────────────────
    cy.get('.step-dot').should('have.length', 3);
    cy.contains('.step-dot', 'Properties').should('have.class', 'active');
    const question = `Wizard e2e poll ${Date.now().toString(36)}?`;
    cy.get('input[placeholder="Who is the best?"]').type(question);
    cy.get('select, .visibility-field select').first();
    cy.contains('button', 'Next →').click();

    // ── Step 2: Groups & characters ──────────────────────────────────────────
    cy.contains('.step-dot', 'Groups').should('have.class', 'active');
    cy.get('.group-label-input').eq(0).type('Alpha');
    cy.get('.group-label-input').eq(1).type('Beta');

    cy.get('.candidate-slot p-select').eq(0).click();
    cy.get('.p-select-overlay li.p-select-option').first().click();
    cy.get('.candidate-slot p-select').eq(1).click();
    cy.get('.p-select-overlay li.p-select-option').first().click();
    cy.get('.candidate-slot p-select').eq(2).click();
    cy.get('.p-select-overlay li.p-select-option').first().click();
    cy.get('.candidate-slot p-select').eq(3).click();
    cy.get('.p-select-overlay li.p-select-option').first().click();

    const fmt = (d: Date) => d.toISOString().slice(0, 16);
    const now = new Date();
    const in10days = new Date(now.getTime() + 10 * 86_400_000);
    const in20days = new Date(now.getTime() + 20 * 86_400_000);
    const in40days = new Date(now.getTime() + 40 * 86_400_000);

    cy.get('.period-check input[type="checkbox"]').eq(0).check({ force: true });
    fillDateTime(cy.get('input[type="datetime-local"]').eq(0), fmt(in10days));   // group 1 (start now) ends in 10 days
    fillDateTime(cy.get('input[type="datetime-local"]').eq(1), fmt(in20days));   // group 2 starts in 20 days
    fillDateTime(cy.get('input[type="datetime-local"]').eq(2), fmt(in40days));   // group 2 ends in 40 days

    cy.contains('button', 'Next →').click();

    // ── Step 3: Summary ──────────────────────────────────────────────────────
    cy.contains('.step-dot', 'Summary').should('have.class', 'active');
    cy.get('.summary-value').should('contain.text', question);
    cy.get('.summary-group-card').should('have.length', 2);
    cy.contains('.summary-group-card', 'Alpha').should('exist');
    cy.contains('.summary-group-card', 'Beta').should('exist');

    cy.contains('button', 'Create').click();
    cy.contains('.dialog button', 'Confirm').click();
    cy.contains('.toast', 'Multi-poll created', { timeout: 10000 }).should('be.visible');
    cy.get('input[placeholder="Search multi-polls…"]').type(question);
    cy.contains('tr', question).should('exist');
  });

  it('blocks advancing past a step with invalid data and shows the reason', () => {
    openManagement();
    cy.contains('.nav-item', 'Multi-Polls').click();
    cy.contains('button', '+ New Multi-Poll').click();

    // empty question blocks step 1
    cy.contains('button', 'Next →').click();
    cy.contains('.step-dot', 'Properties').should('have.class', 'active');

    cy.get('input[placeholder="Who is the best?"]').type('Blocked wizard poll?');
    cy.contains('button', 'Next →').click();

    // no candidates / no schedule blocks step 2
    cy.contains('button', 'Next →').click();
    cy.contains('.step-dot', 'Groups').should('have.class', 'active');
    cy.get('.error-msg-block, .cross-error').should('exist');
  });

  it('the enriched table shows visibility, voting mode and time-remaining status', () => {
    openManagement();
    cy.contains('.nav-item', 'Multi-Polls').click();
    cy.get('table thead').should('contain.text', 'Visibility').and('contain.text', 'Mode').and('contain.text', 'Status');
    cy.get('.vis-badge').should('have.length.greaterThan', 0);
    cy.get('.mode-badge').should('contain.text', 'Character');
    cy.get('.time-badge').should('have.length.greaterThan', 0);
  });

  it('My Content also uses the wizard for its own multi-polls', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.admin-btn', { timeout: 10000 }).click();
    cy.contains('.nav-item', 'My Content').click();
    cy.contains('.sub-tab', 'Multi-Polls').click();
    cy.contains('button', '+ New Multi-Poll').click();
    cy.get('.step-dot').should('have.length', 3);
    cy.contains('.step-dot', 'Properties').should('have.class', 'active');
  });
});
