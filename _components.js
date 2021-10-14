
ReCharge.Novum.Components = {
  /**
   * Creates a radio component.
   * Use this function to dynamically render our radio components 
   * @param {object} props 
   * @param {HTMLElement} element 
   */
  createRadio(props) {
    if (!props) return;

    const { id, name, label, value, isChecked } = props;
    const radioContainer = document.createElement('label');
    radioContainer.setAttribute('for', id);
    radioContainer.classList.add('rc-radio');
    radioContainer.innerHTML = `
      <input type="radio" id="${id}" name="${name}" class="rc-radio__input visually-hidden" value="${value}" ${isChecked ? 'checked="true"' : ''}/>
      <span class="rc-radio__control" aria-hidden="true"></span>
      <span class="rc-radio__label">
        ${label}
      </span>
    `;
    return radioContainer;
  },

  /**
   * Renders the address to the passed in element.
   * Use this function to dynamically render addresses (helpful for preventing page reloads!) 
   * @param {object} address 
   * @param {HTMLElement} element 
   */
  renderAddress(address, element) {
    if (!element) return;
    element.innerHTML = ReCharge.Novum.DomCreators.getAddressDom(address);
  },

  /**
   * Renders the payment details to the passed in element.
   * Use this function to dynamically render the payment method details
   * @param {object} paymentMethod 
   * @param {HTMLElement} element 
   */
  renderPaymentMethodDetails(paymentMethod, element) {
    if (!element) return;
    element.innerHTML = ReCharge.Novum.DomCreators.getPaymentMethodDetailsDom(paymentMethod);
  },

  /**
   * Renders an accessibile expandable card. 
   * Assumes the element has the correct child classes (rc-expandable-card--summary and rc-expandable-card--details)
   * @param {HTMLElement} element 
   */
  renderExpandableCard(element) {
    if (element.classList.contains('rc-card')) return; // Don't try to rerender if it's already rendered
    element.classList.add('rc-card');
    element.tabIndex = '0';
    element.setAttribute('aria-expanded', false);

    const iconContainer = document.createElement('span');
    iconContainer.classList.add('ml-2', 'rc-expandable-card--arrow');
    iconContainer.innerHTML = '<i class="fas fa-chevron-down"></i>';

    const summaryEl = element.querySelector('.rc-expandable-card--summary');
    summaryEl?.appendChild(iconContainer);

    const listener = (e) => {
      e.stopPropagation();
      // Only allow Enter and space keyboard events for accessibility
      if (e.type === 'keypress' && (!['Enter', ' '].includes(e.key))) return;

      const detailsEl = element.querySelector('.rc-expandable-card--details');
      if (detailsEl) {
        // If the element clicked on is inside the details, is a button, or we are in a transition, don't fire any events
        if (e.target.tagName === 'BUTTON' || detailsEl.contains(e.target) || element.classList.contains('in')) return;

        const isOpening = !element.classList.contains('open');
        if (!isOpening) {
          detailsEl.style.height = `${detailsEl.scrollHeight}px`;
        }

        // Defer transition to make sure everything is up to date (mainly to make sure the heights are synced up)
        setTimeout(() => {
          element.classList.add('in');
          detailsEl.style.height = isOpening ? `${detailsEl.scrollHeight}px` : 0;
          element.setAttribute('aria-expanded', isOpening);
          element.classList.toggle('open', isOpening);

          // Defer removing the transition until it's complete
          setTimeout(() => {
            element.classList.remove('in');
            if (isOpening) {
              detailsEl.style.height = 'auto'; // reset height after transition so it adapts to screensize changes
            }
          }, 200);
        }, 0);
      }
    }

    // Add both click and keypress for accessibility
    element.addEventListener('click', listener);
    element.addEventListener('keypress', listener);
  },
}

ReCharge.Novum.DomCreators = {
  /**
   * Renders the passed in dom. If it's a falsy value, don't render it
   * @param {string} dom 
   * @returns 
   */
  render(dom) {
    return !!dom ? dom : '';
  },
  /**
   * Gets the dom for and address
   * @param {object[]} subscriptions 
   * @returns {string} Associated Subscriptions dom
   */
  getAddressDom(address) {
    return `
      <div class="address text-body-2" data-id="${address.id}">
        <div class="name">
          ${address.first_name} ${address.last_name}
        </div>
        <div class="address-line">
          ${address.address1} ${address.address2 || ''}
        </div>
        <div class="city-state-zip">
          ${address.city}, ${address.province} ${address.zip}
        </div>
      </div>
    `
  },
  /**
   * Gets the dom for associated subscriptions
   * @param {object[]} subscriptions 
   * @returns {string} Associated Subscriptions dom
   */
  getAssociatedSubscriptionsDom(subscriptions = []) {
    return `
      <div class="associated-subscriptions text-body-2">
        <h4 class="rc-subheading mt-4">Associated Subscriptions</h4>
        ${subscriptions.length === 0 ? '<div>No associated subscriptions</div>' : ''}
        <div class="subscription">
          ${subscriptions.map(subscription => `
            <div class="subscription-item">${subscription.product_title} - ${subscription.order_interval_frequency} ${subscription.order_interval_unit}(s)</div>
          `).join('\n')}
        </div>
      </div>`
  },

  /**
   * Gets the dom for the payment method details
   * @param {object} paymentMethod 
   * @returns {string} Associated Subscriptions dom
   */
  getPaymentMethodDetailsDom(paymentMethod) {
    const { capitalize } = ReCharge.Novum.Utils;
    const { render } = ReCharge.Novum.DomCreators;
    const paymentDetails = paymentMethod.payment_details;
    const paymentType = paymentMethod.payment_type;
    const brand = paymentDetails.brand.toLowerCase();

    return `
      <div class="payment-method-details flex-1 text-body-2" data-id="${paymentMethod.id}">
        <div class="payment-type">
          ${brand ? `${capitalize(brand)} ending in ${paymentDetails.last4}` : capitalize(paymentType.toLowerCase().replace('_', ' '))}
        </div>
        ${render(paymentDetails.exp_month && paymentDetails.exp_year && `
          <div class="expires">Expires ${paymentDetails.exp_month}/${paymentDetails.exp_year}</div>`)}
      </div>`;
  },

  /**
   * Creates a spinner
   * @param {object.size} size Size of the spinner   
   * @returns The spinner dom
   */
  createSpinner({ size = 12 } = {}) {
    const spinnerContainer = document.createElement('div');
    spinnerContainer.setAttribute('role', 'progressbar');
    spinnerContainer.setAttribute('aria-valuemin', '0');
    spinnerContainer.setAttribute('aria-valuemax', '100');
    spinnerContainer.setAttribute('role', 'progressbar');
    spinnerContainer.classList.add('rc-progress');
    spinnerContainer.innerHTML = `
      <svg viewBox="0 0 100 100" class="rc-progress__svg" style="height: ${size}px; width: ${size}px;">
        <circle cx="50" cy="50" r="42" stroke-width="10px" class="rc-progress__track"></circle>
        <circle cx="50" cy="50" r="42" stroke-width="10px" class="rc-progress__indicator"></circle>
      </svg>
    `;
    return spinnerContainer;
  }

}

function initializeExpandableCards() {
  document.querySelectorAll('.rc-expandable-card').forEach(ReCharge.Novum.Components.renderExpandableCard);
}

// Auto render any expandable cards
initializeExpandableCards();