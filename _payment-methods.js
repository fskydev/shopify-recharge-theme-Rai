const rcPaymentMethods = {{ payment_methods | json }};
sessionStorage.removeItem('rc_billing_countries'); // Remove old countries in case it still exists
sessionStorage.setItem('rc_countries', JSON.stringify({{ billing_countries | json }})); // Used by the country/province select utils

// IIFE to not muddy up the global context
(function () {
  const { renderExpandableCard } = ReCharge.Novum.Components;
  const { getAddressDom, getAssociatedSubscriptionsDom, render, createSpinner, getPaymentMethodDetailsDom } = ReCharge.Novum.DomCreators;
  const { capitalize } = ReCharge.Novum.Utils;
  let isApiRequestPending = false; // Is there a request pending on this page?

  function findAndReplacePaymentMethod(paymentMethod) {
    const idx = rcPaymentMethods.findIndex(pm => pm.id === paymentMethod.id);
    rcPaymentMethods[idx] = { ...rcPaymentMethods[idx], ...paymentMethod };
  }

  // Creating the v-dom for payment methods
  const paymentMethodCardsEl = document.createElement('div');
  paymentMethodCardsEl.classList.add('payment-method-cards');
  document.getElementById('PaymentMethodsPage')?.append(paymentMethodCardsEl);

  // Will recalculate all the content that needs to change to not require a reload
  function getDynamicPaymentMethodContent(paymentMethod) {
    const paymentDetails = paymentMethod.payment_details;
    const paymentType = paymentMethod.payment_type;
    const brand = paymentDetails.brand.toLowerCase();
    return {
      address: getAddressDom(paymentMethod.billing_address),
      paymentType: brand ? `${capitalize(brand)} ending in ${paymentDetails.last4}` : capitalize(paymentType.toLowerCase().replace('_', ' ')),
      cardSummary: `
        <span class="mr-2 d-flex">
         ${getPaymentMethodDetailsDom(paymentMethod)}
        </span>
      `
    }
  }

  function renderPaymentMethods() {
    rcPaymentMethods.forEach((paymentMethod) => {
      const isShopify = paymentMethod.processor_name === 'shopify_payments';
      const allowEdit = !isShopify;
      const subscriptions = paymentMethod.subscriptions;

      let element = document.querySelector(`.payment-method[data-payment-method-id="${paymentMethod.id}"]`);
      const hasRendered = !!element;
      const content = getDynamicPaymentMethodContent(paymentMethod);

      // You can't remove payment methods with subscriptions or if it's the last one
      const allowRemove = !subscriptions.length && rcPaymentMethods.length > 1 && !isShopify;

      // Generate the element if it hasn't been rendered yet
      if (!hasRendered) {
        element = document.createElement('div');
        element.classList.add('payment-method', 'rc-expandable-card');
        element.setAttribute('data-payment-method-id', paymentMethod.id);

        // Generate the payment method
        element.innerHTML = `
          <div class="rc-expandable-card--summary">
            <span class="mr-2 d-flex align-items-center">
              <span class="payment-method-logo">${getCardLogo(paymentMethod)}</span>
              <span class="description flex-1">
                <div class="payment-type">
                  ${content.paymentType}
                </div>
              </span>
            </span>
          </div>
          <div class="rc-expandable-card--details">
            <div class="grid-250">
              <div class="payment-method-details">
                <h4 class="rc-subheading mt-4">Payment Method</h4>
                <div class="card-summary mb-2">
                  ${content.cardSummary}
                </div>
                ${render(allowEdit && `
                  <button class="edit-payment-method rc-btn rc-btn--link" type="button">
                    <span class="rc-btn--icon">{% include '_edit-icon.svg' %}</span>
                    Edit Payment Method
                  </button>
                  `)}
              </div>
              <div class="billing-address-container">
                <h4 class="rc-subheading mt-4">Billing Address</h4>
                <div class="billing-address mb-2">${content.address}</div>
                ${render(allowEdit && `
                  <button class="edit-billing-address rc-btn rc-btn--link" type="button">
                    <span class="rc-btn--icon">{% include '_edit-icon.svg' %}</span>
                    Edit Billing Address
                  </button>
                  `)}
              </div>
            </div>
            ${getAssociatedSubscriptionsDom(subscriptions)}
            ${render((isShopify || allowRemove) && `
              <div class="actions d-flex justify-end">
                ${render(allowRemove && `
                  <button type="button" class="remove-payment-method rc-btn rc-btn--primary-border mt-5">
                    Remove Payment Method
                  </button>
                `)}
                ${render(isShopify && `
                  <button type="button" class="edit-shopify-payment-method rc-btn rc-btn--primary-border mt-5 ml-2">
                    Edit Payment Method
                  </button>
                `)}
              </div>
            `)}
          </div>
        `;

        renderExpandableCard(element);
        paymentMethodCardsEl.append(element);
        element.querySelector('.edit-payment-method')?.addEventListener('click', onEditPaymentMethod);
        element.querySelector('.edit-shopify-payment-method')?.addEventListener('click', onEditShopifyPaymentMethod);
        element.querySelector('.edit-billing-address')?.addEventListener('click', onEditBillingAddress);
        element.querySelector('.remove-payment-method')?.addEventListener('click', onRemovePaymentMethod);
      } else {
        // If it has already been rendered lets just update the dynamic content
        element.querySelector('.payment-method-logo').innerHTML = getCardLogo(paymentMethod);
        element.querySelector('.payment-type').innerHTML = content.paymentType;
        element.querySelector('.billing-address').innerHTML = content.address;
        element.querySelector('.card-summary').innerHTML = content.cardSummary;

        const removeActionEl = element.querySelector('.remove-payment-method');
        if (removeActionEl && !allowRemove) { // If the remove action exists and we cannot remove anymore, remove the button
          element.removeChild(removeActionEl);
        }
      }
    });

    const renderedPaymentMethods = document.querySelectorAll('.payment-method[data-payment-method-id]');
    if (renderedPaymentMethods.length) {
      // Remove all payment methods that no longer exist
      renderedPaymentMethods.forEach((el) => {
        if (!rcPaymentMethods.some(pm => pm.id === Number(el.getAttribute('data-payment-method-id')))) {
          paymentMethodCardsEl.removeChild(el);
        }
      });
    }

    // If there are no payment methods rendered, show empty message
    const emptyEl = paymentMethodCardsEl.querySelector('.empty');
    if (!document.querySelector('.payment-method[data-payment-method-id]')) {
      paymentMethodCardsEl.innerHTML = `<p class="empty">There are no payment methods associated with this account. Please go through checkout again to add one.</p>`;
    } else if (emptyEl) {
      // Remove the no shipping text if it exists and there are addresses to show
      paymentMethodCardsEl.removeChild(emptyEl);
    }
  }

  function getAddressFormData() {
    return {
      first_name: document.getElementById('first_name').value,
      last_name: document.getElementById('last_name').value,
      company: document.getElementById('company').value,
      address1: document.getElementById('address1').value,
      address2: document.getElementById('address2').value,
      country: document.getElementById('country').value,
      city: document.getElementById('city').value,
      province: document.getElementById('province').value,
      zip: document.getElementById('zip').value,
      phone: document.getElementById('phone').value,
    };
  }

  async function sendUpdateEmail(e) {
    e.preventDefault();
    if (isApiRequestPending) {
      return false;
    }
    isApiRequestPending = true;
    const buttonEl = e.target;
    ReCharge.Forms.toggleButtonLoading(buttonEl);

    try {
      const addressId = Number(buttonEl.getAttribute('data-address-id')) || undefined;
      await axios.post(ReCharge.Endpoints.send_shopify_connector_email(), {
        template_type: 'shopify_update_payment_information',
        type: 'email',
        address_id: addressId
      });

      ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, `{{ 'cp_update_email_sent' | t }}`);
      ReCharge.Drawer.close();
    } catch (error) {
      let errorMessage = `{{ "cp_something_went_wrong" | t }}`;
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      ReCharge.Forms.toggleButtonLoading(buttonEl);
      ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
    } finally {
      isApiRequestPending = false;
    }
  }

  function onEditShopifyPaymentMethod(e) {
    ReCharge.Drawer.open({ header: 'Edit payment method', content: `{% include '_edit_shopify_payment_method.html' %}` });
    const paymentSummaryEl = e.path.find(el => el.classList.contains('rc-expandable-card--details')).querySelector('.payment-type');
    document.querySelector('.edit-shopify-payment-method-container .payment-method').innerHTML = paymentSummaryEl.innerHTML;
    const paymentMethodId = getPaymentMethodIdFromEvent(e);
    const addressId = rcPaymentMethods.find(pm => pm.id === paymentMethodId)?.subscriptions[0]?.address_id
    const sendButton = document.querySelector('.shopify-send-update-email');
    if (addressId) {
      sendButton.setAttribute('data-address-id', addressId);
    }
    sendButton.addEventListener('click', sendUpdateEmail);
  }

  async function saveBillingAddress(e) {
    e.preventDefault();
    if (isApiRequestPending) {
      return false;
    }
    isApiRequestPending = true;
    const buttonEl = e.target.querySelector('.update-billing-address');
    ReCharge.Forms.toggleButtonLoading(buttonEl);
    try {
      const id = Number(e.target.getAttribute('data-payment-method-id'));
      const { data: { payment_method } } = await axios.post(ReCharge.Endpoints.payment_methods(id), {
        billing_address: getAddressFormData()
      });

      findAndReplacePaymentMethod(payment_method);
      renderPaymentMethods();
      ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, 'Billing address updated successfully');
      ReCharge.Drawer.close();
    } catch (error) {
      let errorMessage = `{{ "cp_something_went_wrong" | t }}`;
      if (error.response && error.response.data && error.response.data.error) {
        errorMessage = error.response.data.error;
      }
      ReCharge.Forms.toggleButtonLoading(buttonEl);
      ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
    } finally {
      isApiRequestPending = false;
    }
    return false;
  }

  function getPaymentMethodIdFromEvent(e) {
    return Number(e.path.find(el => el.getAttribute('data-payment-method-id')).getAttribute('data-payment-method-id')); // Get the current payment method id
  }

  function onEditBillingAddress(e) {
    const id = getPaymentMethodIdFromEvent(e);
    const paymentMethod = rcPaymentMethods.find(pm => pm.id === id);
    const numOfSubs = paymentMethod.subscriptions.length;
    const subscriptionText = numOfSubs === 1 ? `1 associated subscription` : `${numOfSubs} associated subscriptions`;

    ReCharge.Drawer.open({
      header: 'Edit billing address',
      content: `
        <form action="" method="post" id="Recharge_Address_Form">
          <p class="subs-update-text rc-subtext text-center mb-5">
            Updating this payment method will update ${subscriptionText}.
          </p>

          <h3 class="rc-subheading">Billing Address</h3>
          {% include '_address_fields.html' %}
          <button type="submit" class="update-billing-address rc-btn rc-btn--primary">
            Update
          </button>
        </form>
      ` });

    // Update all the values to be what is current used
    ReCharge.Forms.populateAddressData(paymentMethod.billing_address);

    // Update the countries/province dropdowns
    ReCharge.Forms.buildCountries('billing');
    ReCharge.Forms.updateProvinces(document.getElementById('country'));

    // Add id to form to easily get current payment method
    document.forms.Recharge_Address_Form.setAttribute('data-payment-method-id', id);

    // Add submit handler
    document.getElementById('Recharge_Address_Form').addEventListener('submit', saveBillingAddress);
  }

  function onRemovePaymentMethod(e) {
    const id = getPaymentMethodIdFromEvent(e);

    const paymentMethod = rcPaymentMethods.find(pm => pm.id === id);

    // If we are a shopify payment method, submit an email to remove
    if (paymentMethod.processor_name === 'shopify_payments') {
      onEditShopifyPaymentMethod(e);
      ReCharge.Drawer.setHeader('Remove payment method');
      return;
    }

    ReCharge.Modal.open({
      title: 'Remove payment method?',
      content: 'Are you sure you want to remove this payment method?',
      cancelBtnText: 'Cancel',
      confirmBtnText: 'Remove',
      onConfirm: async (e) => {
        if (isApiRequestPending) {
          return false;
        }
        isApiRequestPending = true;
        const buttonEl = e.target;
        ReCharge.Forms.toggleButtonLoading(buttonEl);
        try {
          await axios.delete(ReCharge.Endpoints.payment_methods(id));

          // Remove paymentMethod from the cache and then syncing the dom
          const idx = rcPaymentMethods.findIndex(pm => pm.id === id);
          rcPaymentMethods.splice(idx, 1);
          renderPaymentMethods();
          ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, 'Payment method successfully removed');
          ReCharge.Modal.close();
        } catch (error) {
          let errorMessage = `{{ "cp_something_went_wrong" | t }}`;
          if (error.response && error.response.data && error.response.data.error) {
            errorMessage = error.response.data.error;
          }
          ReCharge.Forms.toggleButtonLoading(buttonEl);
          ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
        } finally {
          isApiRequestPending = false;
        }
      },
    });
  }

  function addCardWindowListener(onSuccess) {
    const listener = (event) => {
      if (
        event.origin.includes('shopifysubscriptions.com') ||
        event.origin.includes('.rechargeapps.com')
      ) {
        if (event.data?.billingComplete) {
          onSuccess(event.data.paymentMethodId);
          window.removeEventListener('message', listener);
        }
      }
      return;
    }
    window.addEventListener('message', listener, false);
  }

  function createDrawerSpinner() {
    const drawerSpinner = createSpinner({ size: 50 });
    drawerSpinner.style.position = 'absolute';
    drawerSpinner.style.top = '24px';
    drawerSpinner.style.left = 'calc(50% - 25px)';
    return drawerSpinner;
  }

  function onEditPaymentMethod(e) {
    const id = getPaymentMethodIdFromEvent(e);
    // Get the card url and add the id to it before the query
    let url = '{{ payment_methods_card_form_url }}';
    url = url.includes('?') ? url.replace('?', `/${id}?`) : `${url}/${id}`;
    ReCharge.Drawer.open({ header: 'Edit Payment Method', content: `<iframe src="${url}" id="customer-card-form" name="customer-card-form" frameborder="0" allowtransparency="true" style="display: none;"></iframe>` });

    // Get the frame and setup a spinner to display while loading
    const frameEl = document.getElementById('customer-card-form');
    const drawerSpinner = createDrawerSpinner();
    frameEl.insertAdjacentElement('afterend', drawerSpinner);

    frameEl.addEventListener('load', () => {
      // Hide the spinner and show the frame once it's loaded
      drawerSpinner.style.display = 'none';
      frameEl.style.display = 'block';
    });

    // When the card update is successful, try to fetch it and rerender. Otherwise reload the page as a fallback
    addCardWindowListener(async () => {
      ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, 'Payment method updated successfully');
      ReCharge.Drawer.close();
      try {
        const { data: { payment_method } } = await axios.get(ReCharge.Endpoints.payment_methods(id));
        findAndReplacePaymentMethod(payment_method);
        renderPaymentMethods();
      } catch (e) {
        window.location.reload();
      }
    });
  }

  renderPaymentMethods();
})();