describe('TikTok-style vertical feed', () => {
  /** cy.trigger mangles WheelEvent options — dispatch a real one in the app window. */
  const wheel = (deltaY: number) =>
    cy.window().then(win => {
      win.document.querySelector('.poll-stage')!
        .dispatchEvent(new (win as any).WheelEvent('wheel', { deltaY, bubbles: true }));
    });

  it('scrolling the wheel moves to the next and previous poll', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.poll-question', { timeout: 15000 }).invoke('text').then(first => {
      wheel(300);
      cy.get('.poll-question').should($q => expect($q.text().trim()).not.to.eq(first.trim()));
      cy.wait(600); // navigation cooldown
      wheel(-300);
      cy.get('.poll-question').should($q => expect($q.text().trim()).to.eq(first.trim()));
    });
  });

  it('the vertical chevrons navigate too', () => {
    cy.freshUserSession().then(s => cy.visitWithSession(s));
    cy.get('.poll-question').invoke('text').then(first => {
      cy.get('.side-next').click();
      cy.get('.poll-question').should($q => expect($q.text().trim()).not.to.eq(first.trim()));
      cy.get('.side-prev').click();
      cy.get('.poll-question').should($q => expect($q.text().trim()).to.eq(first.trim()));
    });
  });
});
