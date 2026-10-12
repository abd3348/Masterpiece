/* Behavior for this page. Dynamic cards remain in JavaScript. */
(() => {
    'use strict';
    const { api, app, url, heading, progress, summary, action, stageRequest } =
        window.CampusFlowUI;
    async function payment() {
        const r = await stageRequest('payment');
        if (!r) return;
        app.innerHTML =
            heading('Confirm your arrangement', 'Agree rent, deposit and payment directly with the landlord.') +
            progress(r) +
            `<div class="flow-layout"><section class="panel"><h2>Rent is paid directly to your landlord</h2><p>Campus Mate displays the landlord’s asking price. We do not collect rent or deposits, process rental payments, or issue rental payment receipts.</p><div class="notice">Agree the final price, deposit, payment method and handover with your landlord. Confirming here records your arrangement; it does not pay or verify any money.</div><a class="secondary full" href="messages.html?owner=${r.propertyId}">Book a meeting</a><label class="check"><input id="payment-consent" type="checkbox">I have agreed the rental arrangements directly with the landlord.</label><button id="checkout" class="primary full">Confirm arrangement & continue</button><p role="status" id="payment-status"></p></section>${summary(r.property, r)}</div>`;
        const button = document.getElementById('checkout');
        button.addEventListener('click', () =>
            action(button, async () => {
                if (!document.getElementById('payment-consent').checked)
                    throw Error('Confirm that you agreed the arrangements with the landlord.');
                const result = await api.confirmArrangement(r.id);
                window.CampusNavigate(url('rentals', result.rentalId));
            })
        );
    }
    window.CampusFlowUI.render({ payment: payment });
})();
