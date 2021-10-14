function addBillingAddressHandler(ev) {
    ev.preventDefault();

    let title = ev.target.closest("[data-add-billing-address]").dataset.title;
    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_billing_address_details.html' %}`;

    let actionUrl = ReCharge.Endpoints.create_billing_address();
    
    let billingForm = document.querySelector("#ReChargeForm_customer");
    billingForm.setAttribute("action", actionUrl);
    
    getShippingBillingCountries('billing');
    ReCharge.Novum.Utils.getZipLabel();

    billingForm.querySelector('.rc_btn').innerHTML = `{{ 'cp_create' | t }}`;

    ReCharge.Novum.toggleSidebar();
}

function renderBillingAddressHandler(event) {
    event.preventDefault();

    let title = event.target.closest(".rc-card").dataset.title;
    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_billing_address_details.html' %}`;

    let actionUrl = ReCharge.Endpoints.update_billing_address();
    
    let billingForm = document.querySelector("#ReChargeForm_customer");
    billingForm.setAttribute("action", actionUrl);
    let address = ReCharge.Novum.payment_sources[0].billing_address;
    
    ReCharge.Forms.populateAddressData(address);
    
    getShippingBillingCountries('billing');
    ReCharge.Novum.Utils.getZipLabel(address.country);

    ReCharge.Novum.toggleSidebar();
}

function renderPaymentMethod(ev) {
    ev.preventDefault();

    document.querySelector("body").classList.toggle("locked");
    document
        .getElementById("sidebar-card-underlay")
        .classList.toggle("visible");
    document
        .getElementById("te-card-modal")
        .classList.toggle("visible");

    window.addEventListener("message", handleCardFrameMessage, false);
}

function handleCardFrameMessage(event) {
    if (
        event.origin.includes('shopifysubscriptions.com') || 
        event.origin.includes('admin.rechargeapps.com')
    ) {
        if (event.data && event.data.billingComplete) {  
            window.location.reload();
        }
    }

    return;
}

{% if settings['has_shopify_connector'] %}
    async function sendEmailRequest(ev) {
        ev.preventDefault();
        if (window.locked) {
            return false;
        }
        window.locked = true;
        const button = ev.target;
        const buttonInitWidth = button.offsetWidth;
        const data = {
            'template_type': 'shopify_update_payment_information',
            'type': 'email'
        };
        const url = ReCharge.Endpoints.send_shopify_connector_email();

        ReCharge.Forms.toggleSubmitButton(button);
        button.setAttribute('data-text', '{{ "cp_send_email_to_update" | t }}');
        button.style.width = `${buttonInitWidth}px`;
        button.style.pointerEvents = 'none';

        try {
            await axios({
                url,
                method: 'post',
                data
            });

            ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, `{{ 'cp_update_email_sent' | t }}`);
            ReCharge.Forms.toggleSubmitButton(button);
            button.removeAttribute('data-text');
            button.disabled = true;
            button.innerHTML = `{% include '_check-mark-sign.svg' %}`;

            setTimeout(() => {
                button.disabled = false;
                button.innerHTML = `{{ "cp_send_email_to_update" | t }}`;
                button.style.pointerEvents = 'auto';
            }, 180000);
        } catch (error) {
            console.log(error);
            let errorMessage = `{{ "cp_something_went_wrong" | t }}`;
            if (error.response && error.response.data && error.response.data.error) {
                errorMessage = error.response.data.error;
            }
            ReCharge.Forms.toggleSubmitButton(button);
            button.removeAttribute('data-text');
            ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
            button.style.pointerEvents = 'auto';
        } finally {
            delete window.locked;
        }
    }
{% endif %}

(function() {
    let closeCardSidebars = document.querySelectorAll(".close-card-sidebar");
    closeCardSidebars.forEach(sidebar => {
        sidebar.addEventListener("click", (event) => {
            window.removeEventListener("message", handleCardFrameMessage, false);
            renderPaymentMethod(event);

            const creditCardForm = window[0].document.getElementById('credit-card-form'),
                  sepaDebitForm = window[0].document.getElementById('sepa-debit-form'),
                  paymentSelector = window[0].document.getElementById('payment-form-selection-page');

            if (paymentSelector) {
                paymentSelector.style.display = 'block';
                creditCardForm.style.display = 'none';
                sepaDebitForm.style.display = 'none';
            }
        });
    });
})();