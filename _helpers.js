ReCharge.Novum.Helpers = {
    renderSubscriptionProductInfo: function (product, price, quantity = 1, variantId = null) {
        let imageSrc = ReCharge.Novum.Utils.getImageUrl(product, variantId);

        let settings = {{ settings | json }};

        return `
            <div class="element__flex-column">
                <div>
                    <img src="${imageSrc}" class="variant-image" alt="${ product.shopify_details.title.replace('Auto renew', '')}">
                </div>

                <h4>
                    ${product.shopify_details.title.replace('Auto renew', '')}
                </h4>

                <div class="d-flex align-items-center">
                    <span class="js-rc_product_icon margin-right-5"> </span>
                    <span id="variant-price" class="text-font-14 js-product-price" data-price="${price}">
                        ${ReCharge.Novum.Utils.getCurrency()}${Number(price).toFixed(2)}
                    </span>
                </div>
            </div>

            <label class="text-font-14">{{ 'Quantity' | t }}</label>
            <div class="rc_product_quantity border-light margin-top-8" onclick="ReCharge.Novum.Helpers.quantityHandler(event)">
                <span class="button-minus margin-left-5" style="${settings.customer_portal.subscription.change_quantity ? '' : 'pointer-events:none;visibility:hidden;' }">-</span>
                <input
                    type="number"
                    value="${quantity}"
                    min="1"
                    name="quantity"
                    id="variant_quantity"
                    class="text-center align-self-center"
                    style="pointer-events:none;"
                    readonly
                >
                <span value="+" class="button-plus margin-right-5" style="${settings.customer_portal.subscription.change_quantity ? '' : 'pointer-events:none;visibility:hidden;' }">+</span>
            </div>
            <br>
        `;
    },
    renderLineItems: function (subscriptionId, subDate) {
        const container = document.querySelector('#ship__now--container');
        const charge = JSON.parse(sessionStorage.getItem('rc_charges'))[0];

        const lineItems = charge.line_items.map(line_item => {
            const imageUrl = line_item.images['original'];

            return `
                <li class="charge-id" data-charge-id="${charge.id}">
                    <div class="">
                        <div class="rc_image_container">
                            <img
                                src="${imageUrl}" class="variant-image image-size" alt="${ line_item.title.replace('Auto renew', '')}">
                        </div>
                        <h4>
                            ${line_item.title.replace('Auto renew', '')}
                        </h4>
                    </div>
                </li>`
        }).join('')
      
        container.innerHTML = `
            <div> {{ 'cp_products_in_this_charge' | t }} </div>
            <br>
            <ul class="line_items--container">
                ${lineItems}
            </ul>
            <br>
            ${charge.line_items.length > 1
                ?   `
                        <div> {{ 'cp_ship_all_products_or_just_subscription_label' | t }} </div>
                        <br>
                        <div>
                            <button
                                class="rc_btn text-uppercase title-bold ship-now-btn"
                                data-subscription-id="${subscriptionId}"
                                data-type="all"
                            >
                                {{ 'cp_ship_all_products_button' | t }}
                            </button>
                        </div>
                        <div>
                            <button
                                class="rc_btn text-uppercase title-bold ship-now-btn"
                                data-subscription-id="${subscriptionId}"
                                data-type="one"
                            >
                                {{ 'cp_ship_just_subscription_button' | t }}
                            </button>
                        </div>
                    `
                : `
                <div>
                    <button
                        class="rc_btn text-uppercase title-bold ship-now-btn"
                        data-subscription-id="${subscriptionId}"
                        data-type="all"
                    >
                        {{ 'cp_order_now_button' | t }}
                    </button>
                </div>`
            }
        `;
    },
    initCalendar: function(date) {
        // Fetch next shipment date
        let month = document.querySelectorAll('[data-calendar-area="month"]')[0];
        let next = document.querySelectorAll('[data-calendar-toggle="next"]')[0];
        let previous = document.querySelectorAll('[data-calendar-toggle="previous"]')[0];
        let label = document.querySelectorAll('[data-calendar-label="month"]')[0];

        vanillaCalendar.init({
            date,
            disablePastDays: true,
            month,
            next,
            previous,
            label
        });
        document.querySelector("#next_charge_date").setAttribute('value', date);
    },
    quantityHandler: function(evt) {
        evt.preventDefault();

        let settings = {{ settings | json }};

        if (settings.customer_portal.subscription.change_quantity) {
            let decrementButton = document.querySelector(".button-minus");
            let incrementButton = document.querySelector(".button-plus");
            let quantityElement = document.querySelector("[name=quantity]");

            // Update quantity element value
            if (evt.target.className.includes("button-plus")) {
                quantityElement.value++;
            } else if (evt.target.className.includes("button-minus")) {
                if (Number(quantityElement.value) !== 1) {
                    quantityElement.value--;
                }
            }

            // Update buttons styles
            if (Number(quantityElement.value) === 1) {
                decrementButton.setAttribute("style", "pointer-events:none");
                incrementButton.setAttribute("style", "pointer: cursor");
            } else if (quantityElement.value > 1) {
                decrementButton.setAttribute("style", "pointer: cursor");
                incrementButton.setAttribute("style", "pointer: cursor");
            }

            // Update display price
            let priceElement = document.querySelector(".js-product-price");
            let price = quantityElement.value * Number(priceElement.dataset.price);
            priceElement.innerHTML = `${ReCharge.Novum.Utils.getCurrency()}${price.toFixed(2)}`;
        }
    },
    updatePrice: function(product, purchaseType, price, quantity = 1) {
        let newPrice = price;

        const hasDiscount = product.discount_amount && product.discount_amount !== 0 || false;

        if (purchaseType === 'subscription' && hasDiscount) {
            if (product.discount_type == 'percentage') {
                newPrice *= 1 - product.discount_amount / 100;
            } else {
                newPrice -= product.discount_amount;
            }
        }

        // Update data value so that quantity change callback uses the correct value
        this.updatePriceElementDataValue(newPrice);

        let icon;
        // Update icon when purchase type changes
        if (purchaseType === 'subscription') {
            icon = `{% include '_subscription-icon.svg' %}`;
        } else {
            icon = `{% include '_onetime-icon.svg' %}`;
        }

        document.querySelector('.js-rc_product_icon').innerHTML = icon;

        if (quantity !== 1) {
            newPrice *= quantity;
        }

        document.querySelector(
            "#variant-price"
        ).innerHTML = `${ReCharge.Novum.Utils.getCurrency()}${Number(newPrice).toFixed(2)}`;
    },
    getDisplayPrice: function(product) {
        // This calculates the first displaying price on most of the templates/forms
        let price = product.shopify_details.variants[0].price;
        const hasDiscount = product.discount_amount && product.discount_amount !== 0 || false;
        const storeSettings = {{ settings | json }};

        if (!product.subscription_defaults) {
            // If we don't have subscription_defaults object or onetimes are enabled for the store, display normal price
            return price;
        }

        // Calculate discounted price if applicable
        if (hasDiscount) {
            if (product.discount_type == 'percentage') {
                price *= 1 - product.discount_amount / 100;
            } else {
                price -= product.discount_amount;
            }
        }

        return price;
    },
    updatePriceElementDataValue: function(newPrice) {
        // Update price element data value
        let productPriceElement = document.querySelector(".js-product-price");
        productPriceElement.dataset.price = newPrice;
    },
    triggerVariantUpdate: function() {
        const selectEl = document.querySelector("#product_options_container .rc_option__selector");

        if (selectEl) {
            selectEl.dispatchEvent(new Event('change'));
        }
    },
    updateVariant: function(evt) {
        evt.preventDefault();
        const productId = evt.target.dataset.productId;
        const product = ReCharge.Novum.products.find(
            prod => prod.shopify_details.shopify_id == productId
        );

        // Get new variant id
        const newVariantId = document.querySelector('[data-variant-selector]').value;

         const newVariant = product.shopify_details.variants.find(
            variant => variant.shopify_id === Number(newVariantId)
        );

        let variantInput = document.querySelector("input[name='shopify_variant_id']");
        const form = variantInput.parentElement;
        const formAction = form.getAttribute('action');
        const submitBtn = form.querySelector('button[type="submit"]');

          if (newVariant){
            submitBtn.disabled = false;
            formAction.includes('swap')
                ? submitBtn.innerText = `{{ "button_swap_product" | t }}`
                : submitBtn.innerText = `{{ "Add_product" | t }}`
            ;

            // Change product image when variant changes
            let variantImage = ReCharge.Novum.Utils.getImageUrl(product, newVariant.shopify_id);
            document.querySelector(".variant-image").setAttribute("src", variantImage);

            // Update variant id
            variantInput.value = newVariant.shopify_id;

            // Get selected purchase type
            let purchaseType = this.getSelectedPurchaseType();

            // Get current quantity
            let quantity = 1;
            if (document.querySelector("[name=quantity]")) {
                quantity = document.querySelector("[name=quantity]").value;
            }

            // Update price
            this.updatePrice(product, purchaseType, newVariant.price, quantity);

        } else {
            submitBtn.disabled = true;
            submitBtn.innerText = `{{ "unavailable" | t }}`;
        }
    },
    getSelectedPurchaseType: function() {
        const purchaseTypeElement = document.querySelector(
            '[name="purchase_type"]:checked'
        );

        // Use the selected purchase type element if it exists on the form
        if (purchaseTypeElement) {
            return purchaseTypeElement.value;
        }

        // Use the form action url as a fallback
        const formAction = document
            .querySelector("#subscriptionNewForm, #subscriptionSwapForm")
            .getAttribute("action");

        return formAction.includes("/onetimes") ? "onetime" : "subscription";
    },
    renderDeliveryOptions: function(product) {
        let intervalFrequency, deliveryOptions;

        if(product.subscription_defaults) {
            let { order_interval_frequency_options, charge_interval_frequency, order_interval_unit } = product.subscription_defaults;
            // Handle a scenario where ruleset is not sorted out
            if(order_interval_frequency_options.length > 1) {
              charge_interval_frequency = order_interval_frequency_options[0];
            }

            order_interval_frequency_options.forEach(
                frequency => intervalFrequency += `<option value="${frequency}">${frequency} </option>`
            );

            const translatedUnit = ReCharge.Novum.Utils.translateOrderIntervalUnit(
                order_interval_unit,
                order_interval_frequency_options[0]
            );

            deliveryOptions = `
                <div>
                    <label for="charge_interval_frequency" class="text-font-14">
                        {{ 'delivery_schedule_label' | t }}
                    </label>
                    <input type="hidden" name="charge_interval_frequency" value="${charge_interval_frequency}">
                    <div class="rc_input_container margin-top-8">
                    <select
                        name="order_interval_frequency"
                        class="charge_interval_frequency"
                        onchange="document.querySelector('[name=charge_interval_frequency]').value=this.value"
                    >
                        ${intervalFrequency}
                    </select>

                    <select name="order_interval_unit" class="order_interval_unit">
                        <option value="${order_interval_unit}">
                            ${translatedUnit}
                        </option>
                    </select>
                    </div>
                </div>
            `;
        } else {
            deliveryOptions = '';
        }

        return deliveryOptions;
    },
    renderPurchaseOptions: function(product, settings) {
        const { shopify_id } = product.shopify_details;
        let purchaseOptions = '';

            if(
                product.subscription_defaults &&
                product.subscription_defaults.storefront_purchase_options !== 'onetime_only'
            ) {
                if(product.subscription_defaults.storefront_purchase_options.includes('onetime')) {
                    return purchaseOptions += `
                        ${this.renderPurchasenOption(shopify_id, true)}

                        ${this.renderPurchasenOption(shopify_id, false, 'onetime')}
                    `;
                } else {
                    return purchaseOptions += `${this.renderPurchasenOption(shopify_id, true)}`;
                }
            } else {
                return purchaseOptions += `${this.renderPurchasenOption(shopify_id, true, 'onetime')}`;
            }
    },
    renderPurchasenOption: function(id, checked=false, value='subscription') {
        return `
            <div class="rc_purchase_type border-light">
                <input
                    type="radio"
                    id="${value}"
                    name="purchase_type"
                    value="${value}"
                    ${checked ? 'checked': ''}
                    onchange="ReCharge.Novum.Utils.optionChangeCallback(event)"
                    data-id="${id}"
                >
                ${value === 'subscription'
                    ? `<label for="${value}">{{ 'Subscribe' | t }}</label>`
                    : `<label for="${value}">{{ 'cp_onetime' | t }}</label>`
                }
            </div>
            <br>
        `;
    },
    renderVariants: function(product) {
        let optionsContainer = document.querySelector('#product_options_container');
        const { variants, shopify_id } = product.shopify_details;
        let shouldDisableSelect =
            variants.length === 1 &&
            variants[0].title.toLowerCase() !== 'default title'
                ? 'disabled'
                : ''
        ;

        let mappedVariants = variants.map(variant => `
            <option value="${variant.shopify_id}">
                ${variant.title !== ''
                    ? variant.title
                    : 'Default title'
                }
            </option>
        `);

        return optionsContainer.innerHTML += `
            <li class="rc_option">
                <select
                    id="option_${shopify_id}"
                    class="rc_option__selector"
                    onchange="ReCharge.Novum.Helpers.updateVariant(event)"
                    data-product-id=${shopify_id}
                    data-variant-selector
                    ${shouldDisableSelect}
                >
                    ${mappedVariants.join('')}
                </select>
            </li>
        `;
    },
    updateNextChargeDate: function () {
        const addressEl = document.querySelector('#address_id');
        if(!addressEl) return; // Do nothing if the address doesn't exist
        
        const addressId = addressEl.value;
        const chosenAddress = ReCharge.Novum.addresses.find(address => address.id == addressId);
        let datesArray = [];

        if (chosenAddress.subscriptions.length) {
            chosenAddress.subscriptions.map(sub => {
                if(sub.status == "ACTIVE" && sub.next_charge_scheduled_at) {
                    let formattedDate = sub.next_charge_scheduled_at.split('T')[0];
                    datesArray.push(formattedDate);
                }
            });
        }

        let sortedDates = datesArray.sort().filter(function(item, pos, ary) {
            return !pos || item != ary[pos - 1];
        });
        sortedDates.push('custom');

        let datesContainer = document.querySelector('#product_dates_container');
        let dateValues = sortedDates.map(date => {
            if (date === 'custom') {
                return `<option value="custom">{{ 'custom_charge_date' | t }}</option>`;
            }
            if (date != 'custom') {
                return `<option value="${date}">${date}</option>`;
            }
        });

        datesContainer.innerHTML = `
            <label for="address_charge_dates" class="text-font-14">{{ 'First_shipment_date' | t }}</label>
            <select class="margin-top-8" id="address_charge_dates" onchange="ReCharge.Novum.Helpers.renderCustomDate(event)">
                ${dateValues}
            </select>
        `;

        let nextChargeContainer = document.querySelector('#next_charge_date_container');
        let nextChargeDateInput = document.querySelector('[name=next_charge_scheduled_at]');

        if(sortedDates[0] === 'custom') {
            nextChargeContainer.style.display = 'block';
            nextChargeDateInput.value = ReCharge.Novum.Utils.formatDate(new Date());
        } else {
            nextChargeContainer.style.display = 'none';
            nextChargeDateInput.value = sortedDates[0];
        }
    },
    renderCustomDate: function(evt) {
        evt.preventDefault();

        let nextChargeContainer = document.querySelector('#next_charge_date_container');
        let nextChargeDateInput = document.querySelector('[name=next_charge_scheduled_at]');

        if(evt.target.value.toLowerCase().includes('custom')) {
            nextChargeContainer.style.display = 'block';
            nextChargeDateInput.value = ReCharge.Novum.Utils.formatDate(new Date());
        } else {
            nextChargeDateInput.value = evt.target.value;
            nextChargeContainer.style.display = 'none';
        }
    },
    searchProductsHandler: async function(ev, action = 'add') {
        if (ev.keyCode === 13) {
            ev.preventDefault();

            const searchQuery = ev.target.value
                .trim()
                .toLowerCase()
                .replace(/"/g, '')
            ;
            const actionType = action === 'add'
                ? 'add_product'
                : 'swap_product'
            ;
            const schema = ReCharge.Schemas.products.search(searchQuery, 6, 1, actionType);

            const data = await ReCharge.Actions.getProducts(6, schema);

            // Remove OTPs for Swap feature
            let productsToRender = data.products;
            if (action !== 'add') {
                productsToRender = ReCharge.Novum.Utils.isPrepaidProduct(productsToRender);
            }

            ReCharge.Novum.Helpers.renderProducts(productsToRender, action);

            ReCharge.Novum.Pagination.updatePagination();  
        }
    },
    renderUpsells: async function(products) {
        const container = document.querySelector('#rc__upsells--container');
        // Hide loader
        let loader = document.querySelector('#upsells--loader');
        if (loader) {
            loader.setAttribute('style', 'display: none;');
        }

        let productCards = '';

        if (products.length) {
            productCards = products.map(product => {
                let imageSrc = ReCharge.Novum.Utils.getImageUrl(product);
                let price = this.getDisplayPrice(product);

                const { shopify_id, handle, title } = product.shopify_details;

                return `
                        <li class="js-toggle-card text-center rc_single_product_card-wrapper rc-card mb-5" id="product_${shopify_id}">
                            <div class="js-card js-card-${shopify_id}">
                                <div class="rc_image_container">
                                    <img src="${imageSrc}" alt="${handle}">
                                </div>

                                <p class="text-font-14 title-bold upsells-title ${title.replace('Auto renew', '').trim().length > 45 ? 'upsell_text--clip' : 'upsell_text--center'}">
                                    ${title.replace('Auto renew', '')}
                                </p>

                                <p>
                                    ${ReCharge.Novum.Utils.getCurrency()}${Number(price).toFixed(2)}
                                </p>

                                <button
                                    class="rc_btn--secondary text-uppercase title-bold upsell-btn-mobile"
                                    data-product-id="${shopify_id}"
                                    onclick="ReCharge.Novum.Helpers.toggleUpsellsButtons(event)"
                                >
                                    {{ 'cp_add_render_upsells' | t }}
                                </button>
                            </div>
                            ${this.renderUpsellButtons(product)}
                        </li>
                    `;
            }).join('');
        }

        if (container) {
            container.innerHTML = `${productCards}`;
            ReCharge.Novum.Pagination.renderInitialPagination();
        }
    },
    toggleUpsellsButtons: function(evt) {
        evt.preventDefault();
        const id = evt.target.dataset.productId;
        document.querySelector(`.js-button-${id}`).style.display = 'flex';
    },
    renderUpsellButtonOption: function(id, isOtp = false, isSub = false) {
        const otpValue = `{{ 'cp_add_onetime' | t }}`;
        const subValue = `{{ 'cp_add_subscription' | t }}`;

        if (isOtp) {
            return `
                <p
                    class="rc_upsells-btns js-button-${id}"
                    data-product-id="${id}"
                    onclick="ReCharge.Novum.Helpers.addUpsellHandler(event)"
                >
                    <input type="button" data-type="one-time" value="${otpValue}" class="title-bold">
                    <input type="button" data-type="subscription" value="${subValue}" class="title-bold">
                </p>
            `;
        }

        return `
            <p
                class="rc_upsells-btns js-button-${id}"
                data-product-id="${id}"
                onclick="ReCharge.Novum.Helpers.addUpsellHandler(event)"
            >
                <input 
                    type="button" 
                    data-type="${isSub ? "subscription" : "one-time"}" 
                    value="${isSub ? subValue : otpValue}" 
                    class="title-bold"
                >
            </p>
        `;
    },
    renderUpsellButtons: function(product) {
        let buttons = '';
        let storeSettings = {{ settings | json }};

        const { shopify_id } = product.shopify_details;

        if (
            product.subscription_defaults &&
            product.subscription_defaults.storefront_purchase_options !== 'onetime_only'
        ) {
            if(product.subscription_defaults.storefront_purchase_options.includes('onetime')) {
                return buttons += `
                    ${this.renderUpsellButtonOption(shopify_id, true)}
                `;
            } else {
                return buttons += `${this.renderUpsellButtonOption(shopify_id, false, true)}`;
            }
        } 

        return buttons += `${this.renderUpsellButtonOption(shopify_id)}`;
    },
    addUpsellHandler: async function(evt) {
        evt.preventDefault();

        const chosenOption = evt.target.dataset.type;
        if(!chosenOption) return // If there is no chosen option, don't try and add the product
        const parentElement = evt.target.closest('.rc_upsells-btns');
        const productId = parentElement.dataset.productId;
        const settings = {{ settings | json }};

        const schema = ReCharge.Schemas.products.getProduct(productId);
        const data =  await ReCharge.Actions.getProducts(6, schema);
        const chosenProduct = data.products[0];


        const subscription = ReCharge.Novum.subscription;
        let url = chosenOption.includes('one-time') ? "{{ onetime_list_url }}" : "{{ subscription_list_url }}";
        let isInStock;

        if (chosenProduct.shopify_details.variants.length > 1) {
            ReCharge.Novum.sidebarHeading.innerHTML = `{{ "cp_add_product_label" | t }}`;
            ReCharge.Novum.sidebarContent.innerHTML = `{% include '_add_product_details.html' %}`;

            let productContainer = document.querySelector('.rc_add_product_details_container');

            productContainer.innerHTML += `
                <input type="hidden" name="shopify_variant_id" value="${chosenProduct.shopify_details.variants[0].shopify_id}">
                ${ReCharge.Novum.store.external_platform === 'big_commerce'
                    ? `<input type="hidden" name="external_product_id" value="${chosenProduct.shopify_details.shopify_id}">`
                    : ``
                }
                <input type="hidden" name="next_charge_scheduled_at" id="next_charge_scheduled_at" value="${subscription.next_charge_scheduled_at}" required >
                <input type="hidden" name="address_id" value="${subscription.address_id}" required>
                <input type="hidden" name="redirect_url" value="{{ schedule_url }}">

                ${!chosenOption.includes('one-time') ? '' :
                    `<input type="hidden" name="properties[add_on]" value="True">
                    <input type="hidden" name="properties[add_on_subscription_id]" value="${subscription.id}">
                    `
                }

                ${this.renderSubscriptionProductInfo(
                    chosenProduct,
                    this.getDisplayPrice(chosenProduct)
                )}

                ${chosenOption.includes('one-time') ? '' :
                    `<div id="product_schedule_container">
                        ${this.renderDeliveryOptions(chosenProduct)}
                    </div>`
                }

                <div id="product_variant_container">
                    <p class="text-font-14">{{ 'cp_variants' | t }}</p>
                    <ul id="product_options_container"></ul>
                </div>
                <button type="submit" class="rc_btn text-uppercase title-bold">
                    ${evt.target.value}
                </button>
            `;

            this.renderVariants(chosenProduct);
            document.querySelector('#subscriptionNewForm').setAttribute('action', url);

            // Trigger the variant change callback to ensure correct price display
            this.triggerVariantUpdate();

            // Add handler for subscription/otp creation
            document
                .querySelector('#subscriptionNewForm')
                .addEventListener(
                    'submit',
                    (e) => ReCharge.Novum.Utils.createProduct(
                            e, 
                            chosenProduct.shopify_details.shopify_id,
                            'create',
                            chosenProduct.shopify_details.variants
                        )
                );

            ReCharge.Novum.toggleSidebar();
        } else {
            isInStock = ReCharge.Novum.Utils.checkInventory(chosenProduct.shopify_details.variants[0]);
            if (isInStock) {
                evt.target.value = `{{ 'cp_processing_message' | t }}`;
                evt.target.disabled = true;
                let postUrl = 'create_onetime';
                const data = {
                    address_id: subscription.address_id,
                    external_product_id: chosenProduct.shopify_details.shopify_id,
                    shopify_variant_id: chosenProduct.shopify_details.variants[0].shopify_id,
                    quantity: 1,
                    next_charge_scheduled_at: subscription.next_charge_scheduled_at,
                    "properties[add_on]": true,
                    "properties[add_on_subscription_id]": subscription.id,
                }

                if (chosenOption.includes('subscription')) {
                    postUrl = 'list_subscriptions_url';

                    data.order_interval_frequency = chosenProduct.subscription_defaults.order_interval_frequency_options[0];
                    data.charge_interval_frequency = chosenProduct.subscription_defaults.order_interval_frequency_options.length > 1
                      ? chosenProduct.subscription_defaults.order_interval_frequency_options[0]
                      : chosenProduct.subscription_defaults.charge_interval_frequency
                    ;
                    data.order_interval_unit = chosenProduct.subscription_defaults.order_interval_unit;
                }

                data.redirect_url = "{{ schedule_url }}";

                ReCharge.Actions.put(postUrl, null, data, chosenProduct.title);
            } else {
                evt.target.value = `{{ 'cp_out_of_stock' | t }}`;
                evt.target.disabled = true;
                ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ 'cp_product_out_of_stock' | t }}`);
            }
        }
    },
    renderIconAndPrice: function(product) {
        const { storefront_purchase_options } = product.subscription_defaults;
        let otpPrice = +product.shopify_details.variants[0].price;
        let subPrice = +this.getDisplayPrice(product);
        const currency = ReCharge.Novum.Utils.getCurrency();

        if (storefront_purchase_options === 'subscription_only'){
          return `
            <p>
                {% include '_subscription-icon.svg' %}
                ${currency}${subPrice.toFixed(2)}
            </p>
        `
        } else if (storefront_purchase_options === 'onetime_only') {
          return `
            <p>
                {% include '_onetime-icon.svg' %}
                ${currency}${otpPrice.toFixed(2)}
            </p>
        `
        } else {
          return `
            <p>
                {% include '_onetime-icon.svg' %}
                ${currency}${otpPrice.toFixed(2)}
                <svg class="vertical-divider" width="1" height="9" fill="none"><path d="M.962 8.553H.234V.125h.728v8.428z" fill="var(--color-dark-green)"/></svg>
                {% include '_subscription-icon.svg' %}
                ${currency}${subPrice.toFixed(2)}
            </p>
        `
        }
    },   
    renderProducts: function(products, type = 'add') {
        const productsContainer = document.querySelector('.rc_product_list_container');
        productsContainer.innerHTML = '';

        if (!products.length) {
            return productsContainer.innerHTML = `{{ "cp_no_products_found" | t }}`;
        }

        products.forEach(product => {
            const { title, shopify_id } = product.shopify_details;

            productsContainer.innerHTML += `
                <li class="rc_product_card border-light text-center rc_single_product_card-wrapper" id="product_${shopify_id}">
                    <div class="rc_image_container">
                        <img src="${ReCharge.Novum.Utils.getImageUrl(product)}" alt="${product.title}" class="rc_img__sidebar" height="100px" width="100px">
                    </div>

                    <p class="product-title title-bold text-font-14 ${title.trim().length > 35 ? 'upsell_text--clip' : 'upsell_text--center'}">
                        ${title}
                    </p>
                    ${ReCharge.Novum.Helpers.renderIconAndPrice(product)}
                    <button
                        class="rc_btn text-uppercase title-bold view-product-button"
                        data-product-id="${shopify_id}"
                    >
                        {{ 'cp_select_button' | t }}
                    </button>
                </li>
            `;
        });

        let handler = ReCharge.Novum.Utils.addProductDetailsHandler;

        if (type === 'swap') {
            handler = swapProductDetailsHandler;
        }

        document.querySelectorAll('.view-product-button')
            .forEach(button => {
                button.addEventListener('click', handler)
            })
        ;

        ReCharge.Novum.Pagination.renderInitialPagination();
    },
    showElement: function(el) {
        el.setAttribute('style', 'display: inline-block');
    },
    validateResponseData: function(data, type = 'initial') {
        let requiredData = '';

        if (type === 'countries') {
            requiredData = ["shipping_countries", "billing_countries"];
        } else if (type === 'charges') {
            requiredData = ["charges", "onetimes"];
        } else if (type === 'products') {
            requiredData = ["products"];
        } else if (type === 'orders') {
            requiredData = ["charges", "orders", "retention_strategies"];
        }

        if (!data) {
            throw new MissingReChargeDataError(
                `{{ 'cp_missing_response_data_from_response' | t }}`
            );
        }

        const fieldsPresent = Object.keys(data);
        const missingFields = requiredData.filter(
            field => !fieldsPresent.includes(field)
        );

        if (missingFields.length) {
            const missingFieldsMessage = missingFields
                .map(field => `"${field}"`)
                .join();

            let translation = `{{ 'cp_missing_fields_message_from_response' | t }}`;
            translation = translation.replace('{cp_placeholder}', missingFieldsMessage);

            throw new MissingReChargeDataError(
                translation
            );
        }
    },
    fetchChargesOnetimes: async function() {
        const schema = ReCharge.Schemas.charges.plusOnetimes(
            ReCharge.Novum.subscription.address_id,
            ReCharge.Novum.subscription.id
        )

        try {
            const url = `${ReCharge.Endpoints.request_objects()}&schema=${schema}`;
            const response = await axios(url);

            this.validateResponseData(response.data, 'charges');

            sessionStorage.setItem('rc_charges', JSON.stringify(response.data.charges));
            sessionStorage.setItem('rc_onetimes', JSON.stringify(response.data.onetimes));

            if (
                response.data.charges.length &&
                response.data.charges[0].discount_codes.length &&
                ReCharge.Novum.subscription.status == "ACTIVE"
            ) {
                buildDiscountCard(ReCharge.Novum.subscription.address.discount_id);
            }
        } catch (error) {
            console.error(error);
        }
    },
    fetchCharges: async function() {
        const schema = ReCharge.Schemas.charges.perSubscription(
            ReCharge.Novum.subscription.address_id,
            ReCharge.Novum.subscription.id
        );

        try {
            const url = `${ReCharge.Endpoints.request_objects()}&schema=${schema}`;
            const response = await axios(url);

            this.validateResponseData(response.data, 'orders');

            return response.data;
        } catch (error) {
            console.error(error);
            return {
                orders: [],
                charges: [],
                retention_strategies: []
            };
        }
    }
}

const vanillaCalendar = {
    activeDates: null,
    date: new Date(),
    todaysDate: new Date(),

    init: function (options) {
        this.month = options.month;
        this.next = options.next;
        this.previous = options.previous;
        this.label = options.label;
        this.options = options;
        this.date = new Date(options.date + "T20:00:00");
        this.selectedDate = new Date(this.date);
        this.date.setDate(1);
        this.createMonth(this.date);
        this.createListeners();
    },

    createListeners: function () {
        let _this = this;
        this.next.addEventListener('click', function (e) {
        e.preventDefault();
        _this.clearCalendar();
        var nextMonth = _this.date.getMonth() + 1;
        _this.date.setMonth(nextMonth);
        _this.createMonth(_this.date);
        })
        // Clears the calendar and shows the previous month
        this.previous.addEventListener('click', function (e) {
        e.preventDefault();
        _this.clearCalendar();
        var prevMonth = _this.date.getMonth() - 1;
        _this.date.setMonth(prevMonth);
        _this.createMonth(_this.date);
        })
    },

    createDay: function (num, day, year) {

        let newDay = document.createElement('div');
        let dateEl = document.createElement('span');
        dateEl.innerHTML = num;
        newDay.className = 'vcal-date';
        newDay.setAttribute('data-calendar-date', this.date);

        newDay.setAttribute('data-month', this.date.toLocaleString('en-us', { month: 'long' }));
        newDay.setAttribute('data-day', this.date.getDate() + 1);
        // if it's the first day of the month
        if (num === 1) {
            if (day !== 0) {
                newDay.style.marginLeft = ((day) * 14.28) + '%';
            }
        }

        if (this.options.disablePastDays && this.date.getTime() <= this.todaysDate.getTime() - 1) {
            newDay.classList.add('vcal-date--disabled');
        } else {
            newDay.classList.add('vcal-date--active');
            newDay.setAttribute('data-calendar-status', 'active');
        }

        if (this.date.toString() === this.selectedDate.toString()) {
            newDay.classList.add('vcal-date--selected');
        }
        newDay.appendChild(dateEl);
        this.month.appendChild(newDay);
    },

    dateClicked: function () {
        let _this = this;
        this.activeDates = document.querySelectorAll(
        '[data-calendar-status="active"]'
        )
        for (var i = 0; i < this.activeDates.length; i++) {
            this.activeDates[i].addEventListener('click', function (event) {
                document.getElementById("next_charge_date")
                        .setAttribute('value', ReCharge.Novum.Utils.formatDate(this.dataset.calendarDate));
                _this.removeActiveClass();
                this.classList.add('vcal-date--selected');
            });
        }
    },

    createMonth: function (month) {
        let currentMonth = month.getMonth();
        while (month.getMonth() === currentMonth) {
            this.createDay(
                this.date.getDate(),
                this.date.getDay(),
                this.date.getFullYear()
            )
            this.date.setDate(month.getDate() + 1);
        }
        // while loop trips over and day is at 30/31, bring it back
        this.date.setDate(1);
        this.date.setMonth(month.getMonth() - 1);

        this.label.innerHTML =`
            ${this.monthsAsString(month.getMonth())} ${this.date.getFullYear()}
        `;
        this.dateClicked();
    },

    monthsAsString: function (monthIndex) {
        return [
            `{{ "January"| t }}`,
            `{{ "February" | t }}`,
            `{{ "March" | t }}`,
            `{{ "April" | t }}`,
            `{{ "May" | t }}`,
            `{{ "June" | t }}`,
            `{{ "July" | t }}`,
            `{{ "August" | t }}`,
            `{{ "September" | t }}`,
            `{{ "October" | t }}`,
            `{{ "November" | t }}`,
            `{{ "December" | t }}`
        ][monthIndex]
    },

    clearCalendar: function () {
        this.month.innerHTML = ``;
    },

    removeActiveClass: function () {
        for (var i = 0; i < this.activeDates.length; i++) {
            this.activeDates[i].classList.remove('vcal-date--selected')
        }
    }
}

class MissingReChargeDataError extends Error {
    constructor(message) {
        super(message);
        this.name = 'MissingReChargeDataError';
    }
}
