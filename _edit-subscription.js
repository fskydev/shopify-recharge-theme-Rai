/*============================
    CANCELLATION FLOW BEGIN
============================*/

function filterReasons(cancellationReasons, settings, subscription) {

    // Exclude swap incentive_type for prepaid subscription
    let filteredReasons = ReCharge.Novum.Utils.isPrepaid(subscription)
        ? cancellationReasons.filter(reason => reason.incentive_type !== "swap_product")
        : cancellationReasons;

    // Implement store settings for cancellation reasons
    return filteredReasons.filter(reason => {
        if (
            (reason.incentive_type === 'discount' && settings.customer_portal.discount_input) ||
            (reason.incentive_type === 'skip_charge' && settings.customer_portal.subscription.skip_scheduled_order) ||
            (reason.incentive_type === 'swap_product' && settings.customer_portal.subscription.change_product) ||
            reason.incentive_type === 'delay_subscription' ||
            !reason.incentive_type 
        ){
            return reason;
        }
    });
}

function cancelSubscriptionFlow(event) {
    event.preventDefault();

    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: hidden');
    const cancellationReasons = JSON.parse(sessionStorage.getItem('rc_retention_strategies'));
    const subscription = ReCharge.Novum.subscription;
    let store = {{ store | json }};

    ReCharge.Novum.sidebarHeading.innerHTML = ReCharge.Novum.subscription.product_title;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_cancellation_reasons.html' %}`;
    let reasonsContainer = document.querySelector('#rc_cancellation_reasons_list');

    const filteredReasons = filterReasons(cancellationReasons, ReCharge.Novum.settings, subscription);

    reasonsContainer.innerHTML += `
        ${filteredReasons.map(reason => `
            <div class="rc_purchase_type border-light margin-top-10">
                <input
                    id="${reason.cancellation_reason}"
                    type="radio"
                    name="retention_strategy_id"
                    value="${reason.id}"
                >
                <label for="${reason.cancellation_reason}">
                    ${reason.cancellation_reason}
                </label>
            </div>`).join('')}
        <br>

        <button class="rc_btn text-uppercase title-bold rc_proceed-btn"> {{ 'cp_proceed_button' | t }} </button>
    `;

    // add event listener on proceed button
    document.querySelector('.rc_proceed-btn').addEventListener('click', renderRetentionStrategiesHandler);
    ReCharge.Novum.toggleSidebar();
}

function renderRetentionStrategiesHandler(event) {
    event.preventDefault();

    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: visible');
    ReCharge.Novum.backBtn.removeEventListener('click', swapProductHandler, false);
    ReCharge.Novum.backBtn.removeEventListener('click', editProduct, false);
    ReCharge.Novum.backBtn.addEventListener('click', cancelSubscriptionFlow);

    const subscription = ReCharge.Novum.subscription;
    const { id, address_id, order_interval_unit, order_interval_frequency } = subscription;
    const cancellationReasons = JSON.parse(sessionStorage.getItem('rc_retention_strategies'));
    const strategyId = document.querySelector('[name=retention_strategy_id]:checked').value;
    const retentionStrategy = cancellationReasons.find( reason => reason.id == strategyId);

    const { incentive_type, discount_code, prevention_text, cancellation_reason } = retentionStrategy;

    let output, btnText, btn, actionUrl, cancellingVerbiage;

    if (incentive_type == 'discount') {
        actionUrl = ReCharge.Endpoints.apply_discount_to_address_url(address_id);
        cancellingVerbiage = `{{ 'cp_discount_should_apply' | t }}`;
        output = `<form method="post" action="${actionUrl}" id="apply-discount-form" onsubmit="applyDiscountHandler(event)" data-code="${discount_code}">`;
        btnText = `{{ 'Apply_discount' | t }}`;
    } else if (incentive_type == 'skip_charge') {
        actionUrl = ReCharge.Endpoints.skip_subscription_url(id);
        cancellingVerbiage = `{{ 'cp_cancel_skip_next_order_message' | t }}`;
        output = `
            <form method="post" action="${actionUrl}" id="ReChargeForm_strategy">
                <input type="hidden" name="subscription_id" value="${subscription.id}">`;
        btnText = `{{ 'Skip_next_charge' | t }}`;
    } else if (incentive_type == 'swap_product') {
        cancellingVerbiage = `{{ 'cp_cancel_swap_product_message' | t }}`;
        if(!ReCharge.Novum.Utils.isPrepaid(subscription)) {
            output = `<button class="rc_btn text-uppercase title-bold" onclick="swapProductHandler(event)"> {{ 'button_swap_product' | t }} </button>`;
        } else {
            output = '';
        }
    } else if (incentive_type == 'delay_subscription') {
        actionUrl = ReCharge.Endpoints.delay_subscription_url(id);
        cancellingVerbiage = `{{ 'cp_cancel_delay_next_order_message' | t }}`;
        const translatedOrderIntervalUnit = ReCharge.Novum.Utils.translateOrderIntervalUnit(order_interval_unit, order_interval_frequency);

        output = `
            <form method="post" action="${actionUrl}" id="ReChargeForm_strategy">
                <label for="delay_for">{{ 'Delay_for' | t }}</label>
                <select name="delay_for" id="delay_for">
                    <option value="${order_interval_unit.includes('day') ? 7 : 1}_${order_interval_unit}">
                        ${order_interval_unit.includes('day') ? 7 : 1}
                        ${translatedOrderIntervalUnit}
                    </option>
                    <option value="${order_interval_unit.includes('day') ? 14 : 2}_${order_interval_unit}">
                        ${order_interval_unit.includes('day') ? 14 : 2}
                        ${translatedOrderIntervalUnit}
                    </option>
                    <option value="${order_interval_unit == 'day' ? 21 : 3}_${order_interval_unit}">
                        ${order_interval_unit.includes('day') ? 21 : 3}
                        ${translatedOrderIntervalUnit}
                    </option>
                </select>
        `;
        btnText = `{{ 'Delay_subscription' | t }}`;
    } else {
        cancellingVerbiage = `{{ 'cp_cancel_why_cancelling_message' | t }}`;
        output = ``;
    }

    if(incentive_type == 'swap_product') {
        btn = ``;
    } else if (incentive_type) {
        btn = `
                <button type="submit" class="rc_btn text-uppercase title-bold">${btnText} </button>
            </form>
        `;
    } else {
        btn = `<textarea class="textarea-size" onchange="document.querySelector('[name=cancellation_reason_comments]').value=this.value"> </textarea><br>`;
    }

    actionUrl = ReCharge.Endpoints.cancel_subscription_url(id);

    ReCharge.Novum.sidebarContent.innerHTML = `
        <h4>${prevention_text != '' ? prevention_text : cancellingVerbiage}</h4>
        ${output}
        ${btn}
        <form method="post" id="cancel_ReChargeForm" onsubmit="ReCharge.Novum.Utils.bulkCancelAddonProducts(event, '${actionUrl}'); return false">
            <input type="hidden" name="cancellation_reason" value="${cancellation_reason}">
            <input type="hidden" name="cancellation_reason_comments" value="">
            <input type="hidden" name="redirect_url" value="{{ subscription_list_url }}">
            <button type="submit" id="cancel_subscription" class="rc_btn--secondary text-uppercase title-bold text-center margin-top-10">
                {{ 'Cancel_my_subscription' | t }}
            </button>
        </form>
    `;
}

async function applyDiscountHandler(event) {
    event.preventDefault();

    const subscriptionAddress = ReCharge.Novum.subscription.address;
    const discountCode = event.target.closest('#apply-discount-form').dataset.code;

    ReCharge.Forms.toggleSubmitButton(event.target.querySelector('button'));

    if(subscriptionAddress.discount_id != null) {
        try {
            await axios({
                url: ReCharge.Endpoints.remove_discount_from_address_url(subscriptionAddress.id),
                method: 'post'
            });

            setTimeout(function() {
                ReCharge.Actions.put('apply_discount_to_address_url', subscriptionAddress.id, {discount_code: discountCode});
            }, 3000);

        } catch(error) {
            console.error(error);
            ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ "cp_discount_create_failed" | t }}`);
        } finally {
            delete window.locked;
        }
    } else {
        ReCharge.Actions.put('apply_discount_to_address_url', subscriptionAddress.id, {discount_code: discountCode});
    }
}

function deleteOnetime(event) {
    event.preventDefault();

    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: hidden');
    const onetimeId = event.target.dataset.onetimeId;
    const isAddOn = event.target.dataset.addOn;
    let actionUrl = ReCharge.Endpoints.cancel_onetime_product(onetimeId);

    let text = isAddOn == "true" ? `{{ 'Delete' | t }}` : `{{ 'cp_remove' | t }}`;
    let translation = `{{ 'cp_cancel_delete_confirm' | t }}`;
    translation = translation.replace('{cp_placeholder}', `${text.toLowerCase()}`);

    ReCharge.Novum.sidebarHeading.innerHTML = text;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <div> ${translation} </div>
        <form action="${actionUrl}" method="post" id="ReChargeForm_delete_onetime">
            <input type="hidden" name="redirect_url" value="{{ schedule_url }}">
            <br>
            <button type="submit" class="rc_btn text-uppercase title-bold">${text}</button>
        </form>
    `;

    ReCharge.Novum.toggleSidebar();
}

/*==========================
	CANCELLATION FLOW END
==========================*/

/*==================
	DISCOUNT BEGIN
==================*/

function addDiscountHandler(event) {
    event.preventDefault();
    const title = event.target.dataset.title;
    const addressId = event.target.dataset.id;
    let actionUrl = ReCharge.Endpoints.apply_discount_to_address_url(addressId);

    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form method="post" action="${actionUrl}" id="ReChargeForm_applyDiscount">
            <label for="discount_code" class="text-font-14">{{ 'cp_discount_code' | t }}</label>
            <input class="margin-top-8" type="text" name="discount_code" id="discount_code">
            <br>
            <button type="submit" class="rc_btn text-uppercase title-bold">{{ 'cp_add_discount_button' | t }}</button>
        </form>
    `;

    ReCharge.Novum.toggleSidebar();
}

async function buildDiscountCard(discountId) {
    const discounts = JSON.parse(sessionStorage.getItem("rc_discounts")) || null;
	let discount = {};

    if (!discounts) {
        discount = await fetchDiscount(discountId);
    } else {
        discount = discounts.find(disc => disc.id === discountId);
        if (!discount) {
          discount = await fetchDiscount(discountId);
        }
    }

    if (validateDiscountForSubscription(discount)) {
        populateDiscountCard(discount);
        showDiscountCard();
    }
}

function validateDiscountForSubscription(discount) {
    const subscription = ReCharge.Novum.subscription;

    const hasValidAppliesTo = validateAppliesTo(discount, subscription);
    const hasValidAppliesToProductType = validateAppliesToProductType(discount);

    return hasValidAppliesTo && hasValidAppliesToProductType;
}

function validateAppliesTo(discount, subscription) {
    switch (discount.applies_to) {
        case 'shopify_product':
            const productId = discount.applies_to_id;

            return subscription.product.shopify_product_id === productId;
        case 'shopify_collection_id':
            // No current way of defining if the subscription product is on the specified shopify collection.
            const rc_charges = JSON.parse(sessionStorage.getItem('rc_charges'));

            if(rc_charges[0]) {
                if(rc_charges[0].discount_codes.length) {
                    return true;
                }
            }
            return false;

        default:
            return true;
    }
}

function validateAppliesToProductType(discount) {
    const validProductTypes = ['ALL', 'SUBSCRIPTION'];

    return validProductTypes.includes(discount.applies_to_product_type);
}

async function fetchDiscount(discountId) {
    const schema = ReCharge.Schemas.discounts.list(discountId);

    try {
        const response = await axios(`${ReCharge.Endpoints.request_objects()}&schema=${schema}`);

        if (Object.keys(response.data.discounts).length) {
            return response.data.discounts;
        }

    } catch (error) {
        console.error(error.response.data.error);
        return;
    }

    return;
}

function populateDiscountCard(discount) {
    const card = document.querySelector('.rc_discount_container');
    const discountValue = calculateDiscountValue();

    if (discountValue) {
        card.querySelector('.rc_discount__code').textContent = discount.code;
        card.querySelector('.rc_discount__value').textContent = `-${ReCharge.Novum.Utils.getCurrency()}${Number(discountValue).toFixed(2)}`;
    }
}

function calculateDiscountValue() {
    const charge = JSON.parse(sessionStorage.getItem('rc_charges'))[0];

    if (
        charge &&
        charge.discount_codes.length
    ) {
       return charge.discount_codes[0].amount;
    }

    return false;
}

function showDiscountCard() {
    document.querySelector('.rc_discount_container').style.display = 'block';
}
/*================
	DISCOUNT END
================*/

/*============================
	EDIT SUBSCRIPTION BEGIN
============================*/

function editNextShipment(event) {
    event.preventDefault();

    const parent = event.target.closest(".rc_card_container");
    const subDate = parent.dataset.date;
    const status = event.target.dataset.status;
    const subscriptionId = ReCharge.Novum.subscription.id;
    const title = ReCharge.Novum.Utils.isPrepaid(ReCharge.Novum.subscription)
        ? `{{ 'next_charge' | t }}`
        : `{{ 'cp_next_shipment' | t }}`;

    let calendarDate = ReCharge.Novum.Utils.formatDate(new Date());

    if (subDate != "None") {
        calendarDate = subDate.split("T")[0];
    }

    let actionUrl = ReCharge.Endpoints.subscription_charge_date_url(subscriptionId);
    if (status === "ONETIME") {
        actionUrl = ReCharge.Endpoints.update_onetime(subscriptionId);
    }
    let redirect_url = ReCharge.Endpoints.update_subscription_url(subscriptionId);

    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form method="post" action="${actionUrl}" id="ReChargeForm_date">
            <input type="hidden" name="redirect_url" value="${redirect_url}">
            {% include '_vanilla_calendar.html' %}
            <br>
            <button
                type="button"
                class="rc_btn text-uppercase title-bold"
                onclick="updateNextChargeDateHandler(event, '${actionUrl}', '${subscriptionId}')"
            >
                {{ 'cp_update_next_shipiment_date_button' | t }}
            </button>
            ${
                ReCharge.Novum.payment_sources[0].status == "active" &&
                ReCharge.Novum.subscription.next_charge_scheduled_at
                    ?  `<button
                          type="button"
                          class="rc_btn--secondary text-uppercase title-bold text-center"
                          onclick="shipNowHandler(event, '${subscriptionId}', '${subDate}')"> {{ 'cp_order_now_button' | t }}
                        </button>`
                    :   ""
            }
        </form>
    `;

    ReCharge.Novum.Helpers.initCalendar(calendarDate);

    if (status === "ONETIME") {
        document
            .querySelector("#next_charge_date")
            .setAttribute("name", "next_charge_scheduled_at");
    }

    ReCharge.Novum.toggleSidebar();
}

function updateNextChargeDateHandler(event, actionUrl, id) {
    event.preventDefault();

    const charge = JSON.parse(sessionStorage.getItem("rc_charges"))[0];
    const onetimes = JSON.parse(sessionStorage.getItem("rc_onetimes")) || null;
    // Get element with the new date value
    const newDateEl = document.querySelector("#next_charge_date");
    const dataToSend = {
        [newDateEl.name]: newDateEl.value
    }

    if (
        charge &&
        charge.line_items.length > 1 &&
        onetimes &&
        onetimes.length &&
        ReCharge.Novum.subscription.status == "ACTIVE"
    ) {
        let subOnetimes = onetimes.filter(
            otp => otp.next_charge_scheduled_at == charge.scheduled_at && otp.address_id == charge.address_id)
        ;

        if (subOnetimes.length) {
            ReCharge.Novum.sidebarHeading.innerHTML = `{{ 'cp_next_order' | t }}`;

            let translation = `{{ 'cp_number_of_associted_products_with_this_order' | t }}`;
            translation = translation.replace('{cp_placeholder}', `${subOnetimes.length}`);

            ReCharge.Novum.sidebarContent.innerHTML = `
                <div class="margin-bottom-20">
                    ${translation}
                </div>
                <div>
                    ${ReCharge.Novum.Utils.renderSubOnetimes([ReCharge.Novum.subscription])}
                </div>

                <div class="subscription-order-divider"> </div>

                <div class="margin-top-10">
                    ${ReCharge.Novum.Utils.renderSubOnetimes(subOnetimes)}
                </div>

                <div>
                    <button
                        class="rc_btn text-uppercase title-bold ship-now-btn"
                        onclick="ReCharge.Novum.Utils.bulkUpdateOnetimes(event, '${newDateEl.name}', '${newDateEl.value}', '${actionUrl}')"
                    >
                        {{ 'cp_update_for_all_products_button' | t }}
                    </button>
                </div>
                <div>
                    <button
                        class="rc_btn text-uppercase title-bold ship-now-btn"
                        onclick="ReCharge.Novum.Utils.triggerSingleProductUpdate(event, '${actionUrl}', '${newDateEl.name}', '${newDateEl.value}')"
                    >
                        {{ 'cp_update_for_this_product_only_button' | t }}
                    </button>
                </div>
            `;
        } else {
            ReCharge.Forms.toggleSubmitButton(event.target);
            ReCharge.Actions.put('update_next_charge_date', actionUrl, dataToSend);
        }
    } else {
        ReCharge.Forms.toggleSubmitButton(event.target);
        ReCharge.Actions.put('update_next_charge_date', actionUrl, dataToSend);
    }
}

function editScheduleHandler(event) {
    event.preventDefault();

    const subscription = ReCharge.Novum.subscription;
    let settings = {{ settings | json }};
    let deliveryOutput;
    const { edit_order_frequency } = settings.customer_portal.subscription;
    const { id, order_interval_unit, charge_interval_frequency, order_interval_frequency } = subscription;


    if(edit_order_frequency === 'Any') {
        deliveryOutput = `
            <input type="hidden" name="charge_interval_frequency" class="delivery_frequency" value="${charge_interval_frequency}">
            <input type="hidden" name="order_interval_unit" value="${order_interval_unit}">

            <div>
                <select name="order_interval_frequency" onchange="document.querySelector('[name=charge_interval_frequency]').value=this.value" required>
                    ${ReCharge.Novum.Utils.renderOrderFrequencyOptions(order_interval_unit, order_interval_frequency)}
                </select>
            </div>
            <div class="rc_purchase_type border-light margin-top-10">
                <input id="day" type="radio" name="unit_option" class="unit_option" value="day" ${order_interval_unit.includes('day') ? 'checked' : ''}>
                <label for="day">
                    ${ReCharge.Novum.Utils.translateOrderIntervalUnit('days', order_interval_frequency)}
                </label>
            </div>
            <div class="rc_purchase_type border-light margin-top-10">
                <input id="week" type="radio" name="unit_option" class="unit_option" value="week" ${order_interval_unit.includes('week') ? 'checked' : ''}> <label for="week">
                    ${ReCharge.Novum.Utils.translateOrderIntervalUnit('weeks', order_interval_frequency)} 
                </label>
            </div>
            <div class="rc_purchase_type border-light margin-top-10">
                <input id="month" type="radio" name="unit_option" class="unit_option" value="month" ${order_interval_unit.includes('month') ? 'checked' : ''}> 
                <label for="month">
                    ${ReCharge.Novum.Utils.translateOrderIntervalUnit('months', order_interval_frequency)}
                </label>
            </div>
        `;
    } else if(edit_order_frequency === 'Limited') {
        deliveryOutput = subscription.product.subscription_defaults.order_interval_frequency_options.map(freq => {
            const translatedOrderIntervalUnit = ReCharge.Novum.Utils.translateOrderIntervalUnit(
                subscription.product.subscription_defaults.order_interval_unit,
                freq
            );

            return `
                <div class="rc_purchase_type border-light">
                    <input
                        id="${freq}"
                        type="radio"
                        name="delivery_option"
                        value="${freq}"
                        ${freq == order_interval_frequency ? 'checked' : ''}
                        onclick="document.querySelectorAll('.delivery_frequency').forEach(freq => freq.value=this.value)"
                    >
                    <label for="${freq}">
                        ${freq}
                        ${translatedOrderIntervalUnit}
                    </label>
                </div>
                <br>
            `
        }).join('');

        deliveryOutput += `
            <input type="hidden" name="order_interval_frequency" class="delivery_frequency" value="${charge_interval_frequency}">
            <input type="hidden" name="charge_interval_frequency" class="delivery_frequency" value="${order_interval_frequency}">
            <input type="hidden" name="order_interval_unit" value="${subscription.product.subscription_defaults.order_interval_unit}">
        `;
    } else if(edit_order_frequency === 'Prohibited') {
        const translatedOrderIntervalUnit = ReCharge.Novum.Utils.translateOrderIntervalUnit(
            subscription.order_interval_unit,
            subscription.order_interval_frequency
        );

        deliveryOutput = `
            <input type="hidden" name="charge_interval_frequency" value="${charge_interval_frequency}">
            <input type="hidden" name="order_interval_unit" value="${order_interval_unit}">
            <input type="hidden" name="order_interval_frequency" value="${order_interval_frequency}">
            <div>
                ${charge_interval_frequency}
                ${translatedOrderIntervalUnit}
            </div>
        `;
    }

    const actionUrl = ReCharge.Endpoints.update_subscription_url(id);

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ "cp_deliver_every" | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `
        ${charge_interval_frequency != order_interval_frequency
            ? `{{ 'cp_email_for_prepaid_subscription' | t }} <b><i>{{ settings.customer_portal.subscription.cancellation_email_contact }}</i></b>`
            : `
            <form method="post" action="${actionUrl}" id="ReChargeForm_schedule">
                ${deliveryOutput}
                <button type="submit" class="rc_btn text-uppercase title-bold margin-top-10"> {{ 'cp_update_button' | t }} </button>
            </form>`
        }
    `;

    const unitOptions = document.querySelectorAll('.unit_option') || null;
    if(unitOptions) {
        unitOptions.forEach(unit => unit.addEventListener('click', e => {
            document.querySelector('[name=order_interval_unit]').value = e.target.value;
            let selectEl = document.querySelector('[name=order_interval_frequency]');
            selectEl.innerHTML = ReCharge.Novum.Utils.renderOrderFrequencyOptions(e.target.value, selectEl.value);
        }));
    }

    ReCharge.Novum.toggleSidebar();
}

function shipNowHandler(event, subscriptionId, subDate, openModal = false) {
    event.preventDefault();

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ "cp_order_now_button" | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <div id="ship__now--container">

        </div>
    `;

    ReCharge.Novum.Helpers.renderLineItems(subscriptionId, subDate);

    document
        .querySelectorAll('.ship-now-btn')
        .forEach(btn => btn.addEventListener('click', chargeProcessHandler));

    if (openModal || openModal === 'true') {
        ReCharge.Novum.toggleSidebar();
    }
}

async function chargeProcessHandler(evt) {
    evt.preventDefault();

    const subscriptionId = evt.target.dataset.subscriptionId;
    let type = evt.target.dataset.type;
    let chargeId = document.querySelector('.charge-id').dataset.chargeId;
    let endpoint = '';

    const data = {};
    const shipDate = ReCharge.Novum.Utils.formatDate(new Date());
    data.charge_id = chargeId;

    if (type === 'one') {
        if(ReCharge.Novum.subscription.status === "ONETIME") {
            data.next_charge_scheduled_at = shipDate;
            endpoint = `update_onetime`;
        } else {
            data.date = shipDate;
            endpoint = `subscription_charge_date_url`;
        }
        chargeId = subscriptionId;
    } else {
        endpoint = `process_charge`;
    }

    ReCharge.Forms.toggleSubmitButton(evt.target);
    data.redirect_url = "{{ schedule_url }}";

    await ReCharge.Actions.post(endpoint, chargeId, data);

    ReCharge.Utils.renderChargeProcessSuccessLayout(type);
}

function unskipShipmentHandler(event) {
    event.preventDefault();

    const subscriptionId = event.target.dataset.id;
    const title = `{{ "cp_unskip_header_label" | t }}`;
    const chargeId = event.target.dataset.chargeId;
    const newDate = new Date(event.target.dataset.chargeDate);
    const month = newDate.toLocaleString('default', { month: 'long' });

    let actionUrl = ReCharge.Endpoints.unskip_subscription_url(subscriptionId);

    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form id="ReChargeForm_unskip">
            <div>
                {{ 'cp_your_shipment_on' | t }}
                <span class="color-light-green text-center title-bold">
                    ${month} ${newDate.getDate()}
                </span>
                {{ 'cp_shipment_will_be_unskipped' | t }}
            </div>
            <br>
            <button
                type="button"
                class="rc_btn text-uppercase title-bold"
                onclick="sendRequest(event, '${actionUrl}', ${chargeId ? chargeId : null})"
                data-type="unskip"
            >
                {{ 'cp_unskip_button' | t }}
            </button>
        </form>
    `;

    ReCharge.Novum.toggleSidebar();
}

function skipShipmentHandler(event) {
    event.preventDefault();

    const subscriptionId = event.target.dataset.id;
    const chargeId = event.target.dataset.chargeId;
    const dateValue = event.target.dataset.date;
    const unit = event.target.dataset.unit;
    const isFutureCharge = event.target.hasAttribute('data-future-charge');
    const frequency = Number(event.target.dataset.frequency);
    const addressId = event.target.dataset.addressId;
    const title = `{{ "cp_skip_next_shipment_label" | t }}`;

    let currentDate = event.target.dataset.currentDate;
    let actionUrl = ReCharge.Endpoints.skip_subscription_url(subscriptionId);
    const dateData = ReCharge.Utils.calculateNextChargeDate(dateValue, unit, frequency);

    ReCharge.Novum.sidebarHeading.innerHTML = title;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form id="subscriptionSkipForm">
            ${renderSingleSkipLayout(
                currentDate,
                dateData.shipmentDateSuffix,
                dateData.month,
                dateData.futureDate,
                isFutureCharge,
                dateData.futureDateSuffix
            )}
        </form>

        <button
            class="js-dont-skip rc_btn--secondary rc_btn--secondary--color text-uppercase title-bold text-center"
            onclick="ReCharge.Novum.toggleSidebar()"
        >
            {{ 'cp_no_do_not_skip_button' | t }}
        </button>
    `;

    let container = document.querySelector('#subscriptionSkipForm');
    let submitBtn = container.querySelector('[type="button"]');
    let dontSkipBtn = document.querySelector('.js-dont-skip');

    const otps = ReCharge.Novum.onetimes || JSON.parse(sessionStorage.getItem("rc_onetimes"));

    let typeUrl, msg;
    // check if there are otps and if they are tied to the subscription (have the same address_id and next_charge_scheduled_at)
    if (otps && otps.length) {
        const subOtps = otps.filter(otp => otp.next_charge_scheduled_at == dateValue && otp.address_id == addressId);

        // there are otps tied to a subscription
        if (subOtps.length) {
            ReCharge.Novum.bulk_onetimes = subOtps;
            container = renderSingleSkipLayout(
                currentDate,
                dateData.shipmentDateSuffix,
                dateData.month,
                dateData.futureDate,
                isFutureCharge,
                dateData.futureDateSuffix
            );

            if (chargeId || !isFutureCharge) {
                typeUrl = 'onetime_charge_date_url';
                msg = `
                    <br>
                    <span>
                        {{ 'cp_this_subscription_also_has' | t }}
                        <span class="title-bold">
                            ${subOtps.length} one-time/add-on product${subOtps.length > 1 ? '(s)' : ''}
                        </span>
                        {{ 'cp_it_will_be_delivered_with_next_shipment' | t }}
                    </span>
                `;
            } else if (isFutureCharge) {
                typeUrl = 'cancel_onetime_product';
                msg = `
                    <br>
                    <span>
                        {{ 'cp_this_subscription_also_has' | t }}
                        <span class="title-bold">
                            ${subOtps.length} one-time/add-on product${subOtps.length > 1 ? 's' : ''}
                        </span>
                        {{ 'cp_associated_with_it_will_be' | t }}
                        <span class="title-bold">
                            {{ 'cancelled' | t }}
                        </span>
                        {{ 'cp_you_will_need_to_re_add_it' | t }}
                    </span>
                `;
            }

            document.querySelector('.js-otp-info').innerHTML = msg;
            submitBtn.textContent = `{{ "cp_yes_proceed_button" | t }}`;
            submitBtn.addEventListener('click', (e) => sendRequest(e, actionUrl, chargeId ? chargeId : dateData.formattedDate, dateData.formattedDate, dateData.futureDate, true, typeUrl));
        // there are otps, but are not tied to a subscription
        } else {
            container = renderSingleSkipLayout(
                currentDate,
                dateData.shipmentDateSuffix,
                dateData.month,
                dateData.futureDate,
                isFutureCharge,
                dateData.futureDateSuffix
            );
            submitBtn.addEventListener('click', (e) => sendRequest(e, actionUrl, chargeId ? chargeId : null, dateData.formattedDate, dateData.futureDate));
            if (!window.location.href.includes('schedule')) {
                dontSkipBtn.style.display = 'none';
            }
        }
    }
    // this is for skip on edit subscription page
    else {
        submitBtn.addEventListener('click', (e) => sendRequest(e, actionUrl, chargeId ? chargeId : null, dateData.formattedDate, dateData.futureDate));
        dontSkipBtn.style.display = 'none';
    }

    ReCharge.Novum.toggleSidebar();
}

function renderSingleSkipLayout(currentDate, shipmentDateSuffix, month, futureDate, isFutureCharge, futureDateSuffix) {

    let translation = `{{ 'cp_upcoming_order_will_be_skipped_next_shipment_on' | t }}`;
    const translatedMonth = ReCharge.Novum.Utils.translateMonth(month);
    const translatedCurrentDate = ReCharge.Novum.Utils.translateMonth(currentDate);

    translation = translation.replace('{cp_placeholder}', `${translatedCurrentDate}${shipmentDateSuffix}`);

    return `
        <div class="js-otp-info"> </div>
        <br>
        <div>
            ${translation}
        </div>
        <br>
        <h3 class="color-light-green text-center">
            ${translatedMonth} ${futureDate.getDate()}${futureDateSuffix}
        </h3>
        <button
            type="button"
            class="rc_btn text-uppercase title-bold"
            data-type="${ isFutureCharge ? 'skip-future' : 'skip'}"
        >
            {{ 'Skip' | t }}
        </button>
    `;
}

/*
  This is for Skip/Unskip functionality
*/
async function sendRequest(event, url, chargeId, date, newDate, bulkOtp=false, bulkUrl='onetime_charge_date_url') {
    event.preventDefault();
    window.locked = true;

    ReCharge.Forms.toggleSubmitButton(event.target);
    const type = event.target.dataset.type;
    const action =  type === 'unskip' ? 'unskip' : 'skip';
    const data = getDataByType(type, chargeId, date);

    try {
        await axios({
            url: url,
            method: "post",
            data: data,
        });

        if (bulkOtp) {
            let formattedDate = ReCharge.Novum.Utils.formatDate(newDate);
            syncUpload.upload(
                ReCharge.Novum.bulk_onetimes,
                { next_charge_scheduled_at: formattedDate },
                bulkUrl
            );
        } else {
            ReCharge.Toast.addToast(
                `{{ 'cp_toast_success' | t }}`,
                `${
                    action === 'unskip'
                        ? `{{ 'cp_order_unskipped_successfully' | t }}`
                        : `{{ 'cp_order_skipped_successfully' | t }}`
                }`
            );
            window.location.reload();
        }
    } catch (error) {
        console.error(error);
        ReCharge.Toast.addToast(
            `{{ 'cp_toast_error' | t }}`,
            `${
                action === 'unskip'
                    ? `{{ 'cp_unable_to_unskip_this_order' | t }}`
                    : `{{ 'cp_unable_to_skip_this_order' | t }}`
            }`
        );
        ReCharge.Forms.toggleSubmitButton(event.target);
    } finally {
        delete window.locked;
    }
}

function getDataByType(type, chargeId, date) {
    const data = {};

    if (type === "skip-future") {
        data["date"] = date;
    } else if (type === "unskip" && chargeId) {
        data["charge_id"] = chargeId;
    }

    return data;
}

function editProduct(event) {
    event.preventDefault();

    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: hidden');

    let subscription = ReCharge.Novum.subscription;
    const { id, price, quantity, status, product } = subscription;
    const { change_product, change_variant, edit_order_frequency } = {{ settings | json }}.customer_portal.subscription;
    let shopify_variant_id, variantOutput = '';

    ReCharge.Novum.store.external_platform === 'shopify'
        ? shopify_variant_id = subscription.shopify_variant_id
        : shopify_variant_id = subscription.external_variant_id;

    if (product && product.shopify_details) {
        const availableVariants = ReCharge.Novum.Utils.getAvailableVariants(product);

        variantOutput = availableVariants
            .map(variant => `
                    <div class="rc_purchase_type border-light margin-top-10">
                        <input id="${
                            variant.shopify_id
                        }" type="radio" name="variant_radio_option" value="${
                            variant.shopify_id
                        }" data-price="${variant.price}" ${
                            shopify_variant_id === variant.shopify_id
                                ? "checked"
                                : ""
                        }>
                        <label for="${variant.shopify_id}">${variant.title}</label>
                    </div>
                `
            )
            .join("");
    } else {
        variantOutput = `<div> {{ 'cp_no_variants_label' | t }} </div>`
    }

    if (status === "ONETIME") {
        actionUrl = ReCharge.Endpoints.update_onetime(id);
    } else {
        actionUrl = ReCharge.Endpoints.update_subscription_url(id);
    }

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ "cp_edit_product" | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form
            method="post"
            action="${actionUrl}"
            id="updateVariantForm"
        >
            ${ReCharge.Novum.store.external_platform === 'shopify'
                ? `<input type="hidden" name="shopify_variant_id" value="${subscription.shopify_variant_id}">`
                : `<input type="hidden" name="external_variant_id" value="${subscription.external_variant_id}">`
            }
            <input type="hidden" name="id" value="${subscription.id}">
            ${ReCharge.Novum.Helpers.renderSubscriptionProductInfo(
                product,
                price,
                quantity,
                shopify_variant_id
            )}
            
            ${
                change_variant &&
                product &&
                product.shopify_details.variants.length > 1
                    ? `<label class="text-font-14"> {{ 'cp_variants' | t }} </label>
                       ${variantOutput}`
                    : ``
            }
            <br>
            <button type="submit" class="rc_btn text-uppercse title-bold"> {{ 'cp_update_button' | t }} </button>
        </form>
        ${
            status === "ACTIVE" &&
            change_product &&
            !ReCharge.Novum.Utils.isPrepaid(subscription)
                ?   `<a
                        href=""
                        class="rc_btn--secondary text-uppercase title-bold text-center rc_btn--secondary--color"
                        onclick="swapProductHandler(event, 'product-edit')">{{ 'title_swap_product' | t }}
                    </a>`
                : ""
        }
    `;

    // add handler for updating form
    document.querySelector('#updateVariantForm').addEventListener('submit', updateProductHandler);

    // show correct variant price on initial load
    let variantPriceEl = document.querySelector('#variant-price');
    const variantPrice = `${ReCharge.Novum.Utils.getCurrency()}${(Number(variantPriceEl.dataset.price) * Number(quantity)).toFixed(2)}`;
    variantPriceEl.innerText = variantPrice;

    /* Add on click event that will update the value of shopify_variant_id */
    document.querySelectorAll("[name=variant_radio_option]").forEach((radio) => {
        radio.addEventListener("click", (event) => {
            // Get variant price
            let price = event.target.dataset.price;
            // Get current quantity
            let quantity = document.querySelector("[name=quantity]").value;
            let purchaseType = ReCharge.Novum.subscription.status === 'ACTIVE' ? 'subscription' : 'onetime';

            ReCharge.Novum.Helpers.updatePrice(
                subscription.product, 
                purchaseType, 
                price, 
                quantity
            );

            // Update selected variant
            const variantSelector = ReCharge.Novum.store.external_platform === 'shopify'
                ? `shopify_variant_id`
                : `external_variant_id`;

            document.querySelector(`[name=${variantSelector}]`).value = event.target.value;

            // Change product image when variant changes
            let variantImage = ReCharge.Novum.Utils.getImageUrl(subscription.product, event.target.value);
            document.querySelector(".variant-image").setAttribute("src", variantImage);
        });
    });

    ReCharge.Novum.toggleSidebar();
}

async function updateProductHandler(ev) {
    ev.preventDefault();

    const formEntries = new FormData(ev.target).entries();
    // Get form data
    let data = Object.assign(
        ...Array.from(
            formEntries, 
            ([x, y]) => ({ [x]: y })
        )
    );

    /* 
      Check if submitted shopify_variant_id is equal as subscription's
        - if it is equal, remove it from the data object to be sent (so it woudln't update the whole product)
    */
    const { shopify_variant_id } = ReCharge.Novum.subscription;
    if (shopify_variant_id === +data.shopify_variant_id) {
        delete data.shopify_variant_id;
    }
    // Check if store allows editing quantity
    if (!ReCharge.Novum.settings.customer_portal.subscription.change_quantity) {
        delete data.quantity;
    }
    // Disable submit button
    let submitBtn = ev.target.querySelector('[type="submit"]');
    ReCharge.Forms.toggleSubmitButton(submitBtn);
    // Send request
    return ReCharge.Subscription.update(ReCharge.Novum.subscription.id, data);
}

async function swapProductHandler(event, source = "cancellation-flow") {
    event.preventDefault();

    ReCharge.Novum.backBtn.setAttribute("style", "visibility: visible");
    // remove event where backBtn would lead to swap search that was placed in function swapProductDetailsHandler
    ReCharge.Novum.backBtn.removeEventListener("click", swapProductHandler, false);
    ReCharge.Novum.backBtn.removeEventListener("click", cancelSubscriptionFlow, false);

    // add event where backBtn points to edit product
    if (source === "cancellation-flow") {
        ReCharge.Novum.backBtn.addEventListener("click", cancelSubscriptionFlow);
    } else {
        ReCharge.Novum.backBtn.addEventListener("click", editProduct);
    }

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ 'cp_select_product' | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_render_products.html' %}`;

    const schema = ReCharge.Schemas.products.search('', 6, 1, 'swap_product');
    const data =  await ReCharge.Actions.getProducts(6, schema);
    let productsToRender = data.products;
    productsToRender = ReCharge.Novum.Utils.isPrepaidProduct(productsToRender);

    ReCharge.Novum.Pagination.currentAddPage = 1;
    ReCharge.Novum.Pagination.type = 'add'; 
    ReCharge.Novum.Helpers.renderProducts(productsToRender, 'swap');
    ReCharge.Novum.isSwap = true;

    const input = document.getElementById("rc_search");
    input.setAttribute("placeholder", `{{ 'cp_search_product_to_swap' | t }}`);
    input.addEventListener("keyup", (evt) => ReCharge.Novum.Helpers.searchProductsHandler(evt, 'swap'));
}

async function swapProductDetailsHandler(event) {
    event.preventDefault();

    ReCharge.Novum.backBtn.addEventListener("click", swapProductHandler);

    const subscription = ReCharge.Novum.subscription;
    const productId = event.target.dataset.productId;
    const schema = ReCharge.Schemas.products.getProduct(productId);
    const data =  await ReCharge.Actions.getProducts(6, schema);
    const productToSwap = data.products[0];
    const { shopify_id } = productToSwap.shopify_details.variants[0];

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ 'title_swap_product' | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_swap_product_details.html' %}`;

    const productContainer = document.querySelector(
        ".rc_swap_product_details_container"
    );

    let actionUrl = ReCharge.Endpoints.swap_subscription_url(subscription.id);
    productContainer.setAttribute("action", actionUrl);

    let redirect_url = ReCharge.Endpoints.update_subscription_url(subscription.id);

    productContainer.innerHTML = `
        <input type="hidden" name="redirect_url" value="${redirect_url}">
        ${
            ReCharge.Novum.store.external_platform === 'big_commerce'
                ? `<input type="hidden" name="external_product_id" value="${productToSwap.shopify_product_id}">`
                : ``
        }
        <input type="hidden" name="shopify_variant_id" value="${shopify_id}">

        ${ReCharge.Novum.Helpers.renderSubscriptionProductInfo(
            productToSwap,
            ReCharge.Novum.Helpers.getDisplayPrice(productToSwap)
        )}

        ${ReCharge.Novum.Helpers.renderDeliveryOptions(productToSwap)}
        
        <div id="product_variant_container">
            <p class="text-font-14">{{ 'cp_variants' | t }}</p>
            <ul id="product_options_container"></ul>
        </div>
        <button
            type="submit"
            class="rc_btn text-uppercase title-bold"
        >
            {{ 'button_swap_product' | t }}
        </button>
    `;

    ReCharge.Novum.Helpers.renderVariants(productToSwap);

    // Trigger the variant change callback to ensure correct price display
    ReCharge.Novum.Helpers.triggerVariantUpdate();

    // Add handler for subscription/otp creation
    document
        .querySelector('#subscriptionSwapForm')
        .addEventListener(
            'submit',
            (e) => ReCharge.Novum.Utils.createProduct(
                e, 
                productToSwap.shopify_details.shopify_id, 
                'swap', 
                productToSwap.shopify_details.variants
            )
        );
}
