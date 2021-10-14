const rcSettings = {{ settings | json }};
const rcShippingAddresses = {{ addresses | json }};
sessionStorage.removeItem('rc_shipping_countries'); // Remove old countries in case it still exists
sessionStorage.setItem('rc_countries', JSON.stringify({{ shipping_countries | json }})); // Used by the country/province select utils
const rcPaymentMethods = {{ payment_methods | json }};

// IIFE to not muddy up the global context
(function () {
  const shopifyPaymentMethods = rcPaymentMethods.filter(pm => pm.processor_name === 'shopify_payments');
  const nonShopifyPaymentMethods = rcPaymentMethods.filter(pm => pm.processor_name !== 'shopify_payments');
  const { renderExpandableCard, createRadio } = ReCharge.Novum.Components;
  const { getAddressDom, getAssociatedSubscriptionsDom, render, getPaymentMethodDetailsDom } = ReCharge.Novum.DomCreators;
  const { capitalize } = ReCharge.Novum.Utils;
  let isApiRequestPending = false; // Is there a request pending on this page?
  const allowEditAddress = rcSettings.customer_portal.edit_shipping_address; // Can the user edit their shipping addresses?
  const allowAddAddress = allowEditAddress && rcPaymentMethods.length > 0 && shopifyPaymentMethods.length === 0; // Allow user to add when using Recharge payment methods and they can edit

  // Creating the v-dom for shipping cards
  const shippingInfoCardsEl = document.createElement('div');
  shippingInfoCardsEl.classList.add('shipping-info-cards');
  document.getElementById('ShippingPage')?.append(shippingInfoCardsEl);

  // Will recalculate all the content that needs to change to not require a reload
  function getDynamicShippingContent(address, paymentMethod) {
    let cardSummary = 'No payment method associated';

    if (paymentMethod) { // Only show card info if the payment method exists (we can get into a state where one isn't added yet)
      cardSummary = `
        <span class="mr-2 d-flex">
          ${getCardLogo(paymentMethod)}
          ${getPaymentMethodDetailsDom(paymentMethod)}
        </span>
      `;
    }

    return {
      address: getAddressDom(address),
      cardSummary
    }
  }

  // Renders all the cards. We use js so we don't require a complete reload of the page on any changes
  function renderShippingInfoCards(addresses = rcShippingAddresses) {
    addresses.forEach(address => {

      const paymentMethod = address.include.payment_methods[0]; // There can only be one associated, so always picking first
      let element = document.querySelector(`.shipping-info[data-address-id="${address.id}"]`);
      const hasRendered = !!element;
      const content = getDynamicShippingContent(address, paymentMethod);
      const isShopifyPayment = paymentMethod?.processor_name === 'shopify_payments';
      // Only allow for non shopify payment methods with valid RCI payment methods.
      const allowPaymentMethodEdit = !isShopifyPayment && nonShopifyPaymentMethods.length > 0;

      // Generate the element if it hasn't been rendered yet
      if (!hasRendered) {
        element = document.createElement('div');
        element.classList.add('shipping-info', 'rc-expandable-card');
        element.setAttribute('data-address-id', address.id);
        // Generate the shipping info
        element.innerHTML = `
            <div class="address-info rc-expandable-card--summary position-relative">
              <div class="grid-250">
                <div class="shipping-address-container">
                  <h4 class="rc-subheading">Shipping Address</h4>
                  <div class="shipping-address">
                    ${content.address}
                  </div>
                  ${render(allowEditAddress && `
                    <button class="edit-address rc-btn rc-btn--link mt-1 position-absolute" type="button" data-address-id="${address.id}">
                      <span class="rc-btn--icon">{% include '_edit-icon.svg' %}</span>
                      Edit Address
                    </button>`)}
                </div>
                <div class="payment-method-details">
                  <h4 class="rc-subheading">Payment Method</h4>
                  <div class="card-summary">
                    ${content.cardSummary}
                  </div>
                  ${render(allowPaymentMethodEdit && `
                    <button class="change-payment-method rc-btn rc-btn--link mt-2 position-absolute" type="button" data-address-id="${address.id}">
                      <span class="rc-btn--icon">{% include '_edit-icon.svg' %}</span>
                      Change Payment Method
                    </button>`)}
                </div>
              </div>
            </div>
            <div class="rc-expandable-card--details">
              <div class="details-container">
                ${getAssociatedSubscriptionsDom(address.subscriptions)}
                ${render(!address.subscriptions.length && `
                  <div class="actions mt-5 d-flex justify-end">
                    <button type="button" class="remove-shipping-info rc-btn rc-btn--primary-border" data-address-id="${address.id}">
                      Remove Shipping Info
                    </button>
                  </div>`)}
              </div>
            </div>
          `;

        // Add the element to the dom
        renderExpandableCard(element);
        shippingInfoCardsEl.append(element);
        element.querySelector('.edit-address')?.addEventListener('click', onEditAddress);
        element.querySelector('.change-payment-method')?.addEventListener('click', onChangePaymentMethod);
        element.querySelector('.remove-shipping-info')?.addEventListener('click', onRemoveShippingInfo);
      } else {
        // If it has already been rendered lets just update the dynamic content
        element.querySelector('.shipping-address').innerHTML = content.address;
        element.querySelector('.card-summary').innerHTML = content.cardSummary;
      }
    });

    const renderedAddresses = document.querySelectorAll('.shipping-info[data-address-id]');
    if (renderedAddresses.length) {
      // Remove all addresses that no longer exist
      renderedAddresses.forEach((el) => {
        const addressId = Number(el.getAttribute('data-address-id'));
        if (!addresses.some(address => address.id === addressId)) {
          shippingInfoCardsEl.removeChild(el);
        }
      });
    }

    // If there are no addresses rendered, show no shipping info 
    const emptyEl = shippingInfoCardsEl.querySelector('.empty');
    if (!document.querySelector('.shipping-info[data-address-id]')) {
      shippingInfoCardsEl.innerHTML = `<p class="empty">There are no shipping methods associated with this account.</p>`;
    } else if (emptyEl) {
      // Remove the no shipping text if it exists and there are addresses to show
      shippingInfoCardsEl.removeChild(emptyEl);
    }
  }

  function onRemoveShippingInfo(evt) {
    const id = Number(evt.target.getAttribute('data-address-id'));
    ReCharge.Modal.open({
      title: 'Remove shipping info?',
      content: 'Are you sure you want to remove this shipping info?',
      cancelBtnText: 'Cancel',
      confirmBtnText: 'Remove',
      onConfirm: async (e) => {
        try {
          await ReCharge.Api.submitRequest(() => ReCharge.Api.deleteShippingAddress(id), {
            key: `deleteShippingAddress_${id}`,
            submitButton: e.target,
            successMessage: 'Shipping info successfully removed'
          });

          // Remove the shipping address and update the dom
          const idx = rcShippingAddresses.findIndex(address => address.id === id);
          rcShippingAddresses.splice(idx, 1);
          renderShippingInfoCards();

          ReCharge.Modal.close();
        } catch (error) { }
      },
    });
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

  async function onUpdateAddress(evt) {
    evt.preventDefault();

    const buttonEl = evt.target.querySelector('.save-address');
    ReCharge.Forms.toggleButtonLoading(buttonEl);
    try {
      const id = Number(evt.target.getAttribute('data-address-id'));
      const address = await saveAddress(id);

      const idx = rcShippingAddresses.findIndex(addr => addr.id === address.id);
      rcShippingAddresses[idx] = { ...rcShippingAddresses[idx], ...address };
      renderShippingInfoCards();
      ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, 'Shipping address updated successfully');
      ReCharge.Drawer.close();
    } catch (error) {
      ReCharge.Forms.toggleButtonLoading(buttonEl);
    }
    return false;
  }

  function onEditAddress(evt) {
    const id = Number(evt.target.getAttribute('data-address-id'));
    const address = rcShippingAddresses.find(addr => addr.id === id);

    ReCharge.Drawer.open({
      header: 'Edit shipping info',
      content: `
        <form id="Recharge_Address_Form" data-address-id="${id}">
          {% include '_address_fields.html' %}
          <button type="submit" class="save-address rc-btn rc-btn--primary">
            Save
          </button>
        </form>
      ` });

    // Update all the values to be what is current used
    ReCharge.Forms.populateAddressData(address);

    // Update the countries/province dropdowns
    ReCharge.Forms.buildCountries();
    ReCharge.Forms.updateProvinces(document.getElementById('country'));

    // Add submit handler
    document.forms.Recharge_Address_Form.addEventListener('submit', onUpdateAddress);
  }

  async function onSavePaymentMethod(evt) {
    evt.preventDefault();
    try {
      const paymentMethodId = Number(document.querySelector('input[name="paymentMethod"]:checked').value);
      const id = Number(evt.target.getAttribute('data-address-id'));
      const address = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateShippingAddress({ id, payment_method_id: paymentMethodId }), {
        key: `updateShippingAddress_${id}`,
        submitButton: evt.target.querySelector('.save-payment-method'),
        successMessage: 'Payment method updated successfully'
      });

      const idx = rcShippingAddresses.findIndex(addr => addr.id === address.id);
      rcShippingAddresses[idx] = {
        ...rcShippingAddresses[idx],
        ...address,
        include: {
          // payment method doesn't come back on resource, so adding it here
          payment_methods: [rcPaymentMethods.find(pm => pm.id === paymentMethodId)]
        }
      };

      renderShippingInfoCards();
      ReCharge.Drawer.close();
    } catch (error) { }
    return false;
  }

  function renderPaymentMethodOptions(paymentMethods, selectedPaymentMethod) {
    const optionContainer = document.querySelector('.payment-method-options');

    paymentMethods.forEach((paymentMethod) => {
      const paymentDetails = paymentMethod.payment_details;
      const paymentType = paymentMethod.payment_type;
      const brand = paymentDetails.brand.toLowerCase();

      optionContainer.append(createRadio({
        id: paymentMethod.id,
        value: paymentMethod.id,
        isChecked: selectedPaymentMethod?.id === paymentMethod.id,
        name: 'paymentMethod',
        label: `
          <div>${brand ? `${capitalize(brand)} ending in ${paymentDetails.last4}` : capitalize(paymentType.toLowerCase().replace('_', ' '))}</div>
          ${render(paymentDetails.exp_month && paymentDetails.exp_year && `
              <div class="expires mt-1">Expires ${paymentDetails.exp_month}/${paymentDetails.exp_year}</div>`)}
        `
      }));
    });
  }

  function onChangePaymentMethod(evt) {
    const id = Number(evt.target.getAttribute('data-address-id'));
    const address = rcShippingAddresses.find(addr => addr.id === id);

    ReCharge.Drawer.open({
      header: 'Change payment method',
      content: `
        <form id="RechargePaymentMethodForm" data-address-id="${id}">
          <p class="rc-subtext mb-0">
            Change payment method for ${address.address1}${address.address2 ? ` ${address.address2}` : ''}, ${address.city}, ${address.province} ${address.zip}.
          </p>
          <div class="payment-method-options mb-5"></div>
          <button type="submit" class="save-payment-method rc-btn rc-btn--primary">
            Save
          </button>
        </form>
      ` });

    const currentPaymentMethod = address.include.payment_methods[0];
    const validPaymentMethods = currentPaymentMethod?.processor_name === 'shopify_payments' ? shopifyPaymentMethods : nonShopifyPaymentMethods;
    renderPaymentMethodOptions(validPaymentMethods, currentPaymentMethod);

    // Add submit handler
    document.forms.RechargePaymentMethodForm.addEventListener('submit', onSavePaymentMethod);
  }

  async function saveAddress(id) {
    if (isApiRequestPending) return;
    isApiRequestPending = true;
    try {
      const addressPromise = id ? ReCharge.Api.updateShippingAddress : ReCharge.Api.createShippingAddress;
      const values = getAddressFormData();
      const address = await addressPromise(id ? { id, ...values } : values);
      isApiRequestPending = false;
      return address;
    } catch (error) {
      console.error(error)
      const errorMessage = error.response?.data?.errors?.all || error.response?.data?.errors?.province || `{{ "cp_something_went_wrong" | t }}`;
      ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
      isApiRequestPending = false;
      throw error; // rethrow error to allow other functions to adapt
    }
  }

  // Keep track of the wizards state
  let wizardState = {
    backListenerAdded: undefined,
    address: undefined,
    isDone: false
  };

  function onAddShippingInfoClick() {
    // Reset the current wizard state when opened
    wizardState = {
      backListenerAdded: undefined,
      address: undefined,
      isDone: false
    };
    ReCharge.Drawer.open({
      header: 'Add shipping info',
      content: `
        <!-- Step 1 -->
        <form id="RechargeAddressForm">
          <h4 class="rc-subheading mt-4">Step 1: Shipping Info</h4>
          {% include '_address_fields.html' %}
          <button type="submit" class="next rc-btn rc-btn--primary">
            Next
          </button>
        </form>
        <!-- Step 2 -->
        <form id="RechargePaymentMethodForm" style="display: none;">
          <h4 class="rc-subheading mt-4">Step 2: Payment Method</h4>
          <p class="rc-subtext mb-0">
            Please choose a default payment method for this shipping address. Associating a payment method with your shipping address allows you to manage your subscriptions more easily.
          </p>
          <div class="payment-method-options mb-5"></div>
          <button type="submit" class="add-payment-method rc-btn rc-btn--primary">
            Add shipping info
          </button>
        </form>
      `,
      onBack: () => {
        // If we have an address and we aren't done, this means we are on the payment method step
        if (wizardState.address && !wizardState.isDone) {
          document.forms.RechargeAddressForm.style.display = 'block';
          document.forms.RechargePaymentMethodForm.style.display = 'none';
          ReCharge.Drawer.toggleBackBtn(false);
        }
      }
    });

    // Update the countries/province dropdowns
    ReCharge.Forms.buildCountries();
    ReCharge.Forms.updateProvinces(document.getElementById('country'));

    // Add payment methods to dom
    // If there are shopify payment methods, only allows those to be used. Otherwise use the other methods
    const validPaymentMethods = rcPaymentMethods.some(pm => pm.processor_name === 'shopify_payments') ? shopifyPaymentMethods : nonShopifyPaymentMethods;
    renderPaymentMethodOptions(validPaymentMethods, validPaymentMethods[0]);

    // Add submit handler for step 1
    document.forms.RechargeAddressForm.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      const buttonEl = evt.target.querySelector('.next');
      ReCharge.Forms.toggleButtonLoading(buttonEl);
      try {
        wizardState.address = await saveAddress(wizardState.address?.id); // If an address exists, lets just update it instead

        // Toggle the steps
        document.forms.RechargeAddressForm.style.display = 'none';
        document.forms.RechargePaymentMethodForm.style.display = 'block';
        ReCharge.Drawer.toggleBackBtn(true);

        // Make sure we don't keep readding the listeners
        if (!wizardState.backListenerAdded) {
          const deleteAddressListener = () => {
            if (wizardState.address && !wizardState.isDone) {
              axios.delete(ReCharge.Endpoints.shipping(wizardState.address.id));
              delete wizardState.address;
            }
            document.getElementById('sidebar-underlay').removeEventListener('click', deleteAddressListener);
            document.querySelector('#te-modal .close-btn').removeEventListener('click', deleteAddressListener);
          };

          // Add listener to delete address if drawer closes without adding the payment method
          document.getElementById('sidebar-underlay').addEventListener('click', deleteAddressListener);
          document.querySelector('#te-modal .close-btn').addEventListener('click', deleteAddressListener);
          wizardState.backListenerAdded = true;
        }
      } catch (e) {
        // Do nothing, as errors are already handled
      } finally {
        ReCharge.Forms.toggleButtonLoading(buttonEl);
      }
      return false;
    });

    // Add submit handler for step 2
    document.forms.RechargePaymentMethodForm.addEventListener('submit', async (evt) => {
      evt.preventDefault();
      if (isApiRequestPending) return false;
      isApiRequestPending = true;
      const buttonEl = evt.target.querySelector('.add-payment-method');
      ReCharge.Forms.toggleButtonLoading(buttonEl);
      try {
        const paymentMethodId = Number(document.querySelector('input[name="paymentMethod"]:checked').value);
        await ReCharge.Api.updateShippingAddress({ id: wizardState.address.id, payment_method_id: paymentMethodId });
        wizardState.isDone = true;

        // Adding the newly created address
        rcShippingAddresses.push({
          ...wizardState.address,
          include: {
            // payment method doesn't come back on resource, so adding it here
            payment_methods: [rcPaymentMethods.find(pm => pm.id === paymentMethodId)]
          },
          subscriptions: []
        });

        renderShippingInfoCards();
        ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, 'New shipping info added');
        ReCharge.Drawer.close();
      } catch (error) {
        console.error(error);
        const errorMessage = error.response?.data?.error || `{{ "cp_something_went_wrong" | t }}`;

        ReCharge.Forms.toggleButtonLoading(buttonEl);
        ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, errorMessage);
      } finally {
        isApiRequestPending = false;
      }
      return false;
    });
  }

  document.querySelector('.add-shipping-info')?.addEventListener('click', onAddShippingInfoClick);

  renderShippingInfoCards();

  if (allowAddAddress) {
    document.querySelector('.add-shipping-info').classList.remove('d-none');
  }
})();