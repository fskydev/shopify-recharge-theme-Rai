
// IIFE to not muddy up the global context
(function () {
  let customer = JSON.parse(`{{ customer | json }}`);
  const { settings } = ReCharge.Novum;
  const { createSpinner, getPaymentMethodDetailsDom, getAddressDom } = ReCharge.Novum.DomCreators;
  const { renderPaymentMethodDetails, renderAddress } = ReCharge.Novum.Components;
  const { addAccessibleClickListener } = ReCharge.Novum.Utils;

  // State of all the subscription data we use. Basically caches data we don't need to keep fetching
  const state = {
    paymentMethods: undefined,
    shippingAddresses: undefined
  };

  /** Fetches the passed in request and stores it into our state */
  async function fetchState({ content, request, key }) {
    const loadingEl = document.createElement('div');
    loadingEl.classList.add('loading', 'd-flex', 'justify-center', 'mt-5');
    // Setup the loading spinner while we are fetching
    loadingEl.append(createSpinner({ size: 42 }));
    content.prepend(loadingEl);
    if (!state[key]) {
      state[key] = await request();
    }
    loadingEl.classList.add('d-none');

    return state[key];
  }

  /** Renders the current address and it's payment method and forces a refetch the next time addresses are requested */
  function updateCurrentAddress(address) {
    renderAddress(address, document.querySelector('[data-shipping-address]'));
    // Force a reload of addresses
    delete state.shippingAddresses;

    const paymentMethod = address.include.payment_methods[0]; // Selected is always the first
    renderPaymentMethodDetails(paymentMethod, document.querySelector('[data-payment-method]'));
  }

  async function onUpdatePaymentMethod() {
    const currentPaymentMethodEl = document.querySelector('.subscription-payment-method [data-payment-method]');
    ReCharge.Drawer.open({
      header: 'Change payment method',
      content: `
        <h4 class="rc-subheading">Current Payment Method</h4>
        <div class="text-body-2">
          ${currentPaymentMethodEl.innerHTML}
        </div>
        <div class="divider my-5"></div>
        <h4 class="rc-subheading">Other Payment Methods</h4>
        <div class="other-payment-methods"></div>
      ` });

    const otherPaymentMethodsEl = document.querySelector('.other-payment-methods');
    const rcPaymentMethods = await fetchState({ key: 'paymentMethods', content: otherPaymentMethodsEl, request: ReCharge.Api.getPaymentMethods });

    // Get the current payment method and check if it's sci. Only allow valid payment methods
    const currentPaymentMethodId = Number(currentPaymentMethodEl.firstElementChild.getAttribute('data-id'));
    const currentPaymentMethod = rcPaymentMethods.find(pm => pm.id === currentPaymentMethodId);
    const isCurrentPMShopify = currentPaymentMethod?.processor_name === 'shopify-payments';

    const validPaymentMethods = rcPaymentMethods.filter(pm => {
      const isSameAsCurrent = pm.id === currentPaymentMethodId; // Don't allow same pm to be selected
      const isShopify = pm.processor_name === 'shopify-payments';
      const isShopifyAllowed = isCurrentPMShopify ? isShopify : !isShopify; // Only allow sci when it's already and sci
      return !isSameAsCurrent && isShopifyAllowed;
    });

    // Add all the valid payment methods to the dom
    validPaymentMethods.forEach((paymentMethod) => {
      const paymentMethodEl = document.createElement('div');
      paymentMethodEl.innerHTML = `
        ${getPaymentMethodDetailsDom(paymentMethod)}
        <button class="update-payment-method rc-btn rc-btn--primary mt-3" data-id="${paymentMethod.id}">Use this Payment Method</button>
      `;
      otherPaymentMethodsEl.append(paymentMethodEl)
    });

    if (!validPaymentMethods.length) {
      const emptyEl = document.createElement('p');
      emptyEl.innerHTML = 'No other payment methods to choose from. Please go through the checkout to create a new payment method.';
      otherPaymentMethodsEl.append(emptyEl);
    }

    // Go through and add the update events to all the valid payment methods
    document.getElementById('te-modal').querySelectorAll('button.update-payment-method').forEach((el) => {
      el.addEventListener('click', async (e) => {
        const { subscription } = ReCharge.Novum;
        try {
          const paymentMethodId = Number(e.target.getAttribute('data-id'));
          const { subscription: updatedSubscription, address: updatedAddress } = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateSubscriptionPaymentMethod(subscription.id, paymentMethodId), {
            key: 'updatePaymentMethod',
            submitButton: e.target,
            successMessage: 'Payment updated'
          });
          // Updating current subscription and adding the new address to it (subscription response doesn't have it associated)
          ReCharge.Novum.subscription = { ...subscription, ...updatedSubscription, address: updatedAddress };
          updateCurrentAddress(updatedAddress);
          ReCharge.Drawer.close();
        } catch (err) { }
      });
    });
  }

  async function onUpdateShippingAddress() {
    const currentAddressEl = document.querySelector('.subscription-shipping-address [data-shipping-address]');

    ReCharge.Drawer.open({
      header: 'Change shipping address',
      content: `
        <h4 class="rc-subheading">Current Shipping Address</h4>
        <div class="text-body-2">
          ${currentAddressEl.innerHTML}
        </div>
        <div class="divider my-5"></div>
        <h4 class="rc-subheading">Other Shipping Addresses</h4>
        <div class="other-shipping-addresses"></div>
      ` });


    const otherShippingAddressesEl = document.querySelector('.other-shipping-addresses');
    const rcShippingAddresses = await fetchState({ key: 'shippingAddresses', content: otherShippingAddressesEl, request: ReCharge.Api.getShippingAddresses });

    const currentShippingAddressId = Number(currentAddressEl.firstElementChild.getAttribute('data-id'));
    const currentShippingAddress = rcShippingAddresses.find(addr => addr.id === currentShippingAddressId);

    // Get the current address and check if it's sci. Only allow valid addresses
    const isCurrentShopifyAddress = currentShippingAddress.include.payment_methods[0].processor_name === 'shopify-payments';
    const validShippingAddresses = rcShippingAddresses.filter(addr => {
      const paymentMethod = addr.include.payment_methods[0];
      if (!paymentMethod) return false; // Don't allow addresses without a payment method

      const isSameAsCurrent = addr.id === currentShippingAddressId; // Don't allow same address to be selected
      const isShopify = paymentMethod.processor_name === 'shopify-payments';
      const isShopifyAllowed = isCurrentShopifyAddress ? isShopify : !isShopify; // Only allow sci when it's already and sci
      return !isSameAsCurrent && isShopifyAllowed;
    });

    // Add all the valid addresses to the dom
    validShippingAddresses.forEach((address) => {
      const addressEl = document.createElement('div');
      addressEl.innerHTML = `
        ${getAddressDom(address)}
        <button class="update-shipping-address rc-btn rc-btn--primary mt-3" data-id="${address.id}">Use this Address</button>
      `;
      otherShippingAddressesEl.append(addressEl)
    });

    if (!validShippingAddresses.length) {
      const emptyEl = document.createElement('p');
      emptyEl.innerHTML = 'No other addresses to choose from. Please go through the checkout to create a new payment method.';
      otherShippingAddressesEl.append(emptyEl);
    }

    // Go through and add the update events to all the valid addresses
    document.getElementById('te-modal').querySelectorAll('button.update-shipping-address').forEach((el) => {
      el.addEventListener('click', async (e) => {
        const { subscription } = ReCharge.Novum;
        try {
          const addressId = Number(e.target.getAttribute('data-id'));
          // Mocked for now until endpoint exists
          const { subscription: updatedSubscription, address: updatedAddress } = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateSubscriptionAddress(subscription.id, addressId), {
            key: 'updateShippingAddress',
            submitButton: e.target,
            successMessage: 'Shipping address updated'
          });
          // Updating current subscription and adding the new address to it (subscription response doesn't have it associated)
          ReCharge.Novum.subscription = { ...subscription, ...updatedSubscription, address: updatedAddress };
          updateCurrentAddress(updatedAddress);

          ReCharge.Drawer.close();
        } catch (err) { }
      });
    });
  }

  function onEditEmailClick() {
    ReCharge.Drawer.open({
      header: 'Edit email address',
      content: `
        <p class="rc-subtext text-center">Updating this email address will update your default email for all subscriptions</p>
        <form id="RechargeEmailForm">
          <div role="group" class="rc-form-control mt-2">
            <label id="email-label" for="email" class="rc-form__label">{{ 'Email' | t }}</label>
            <input type="text" id="email" class="rc-input" type="text" name="email" value="${customer.email}">
          </div>
          <button type="submit" class="update-email rc-btn rc-btn--primary">Update</button>
        </form>
      ` });

    document.forms.RechargeEmailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById('email').value;
        const updatedCustomer = await ReCharge.Api.submitRequest(() => ReCharge.Api.updateCustomer({ email }), {
          key: 'updateEmail',
          submitButton: e.target.querySelector('button[type="submit"]'),
          successMessage: 'Email address updated'
        });
        // Update the customers email
        customer = updatedCustomer;
        document.querySelector('.customer-email .email').innerHTML = customer.email;
        ReCharge.Drawer.close();
      } catch (err) { }
      return false;
    });
  }

  updateCurrentAddress(ReCharge.Novum.subscription.address);

  addAccessibleClickListener(document.querySelector('.subscription-payment-method'), onUpdatePaymentMethod);
  addAccessibleClickListener(document.querySelector('.customer-email'), onEditEmailClick);

  // Don't allow user to edit address if it's turned off 
  if (settings.customer_portal.edit_shipping_address) {
    addAccessibleClickListener(document.querySelector('.subscription-shipping-address'), onUpdateShippingAddress);
  }
})()
