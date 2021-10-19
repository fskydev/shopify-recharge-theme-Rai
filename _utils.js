ReCharge.Novum.Utils = {
    /** Capitalize the string */
    capitalize: str => str.charAt(0).toUpperCase() + str.slice(1),
    /** Adds an accessible click event to the element that adds everything needed to meet accessibility requirements */
    addAccessibleClickListener: (element, onClick) => {
        if (!element) return;

        element.role = 'button';
        element.tabIndex = '0';
        element.classList.add('cursor-pointer');

        const listener = (evt) => {
            evt.stopPropagation();
            // Only allow Enter and space keyboard events for accessibility
            if (evt.type === 'keypress' && (!['Enter', ' '].includes(evt.key))) return;
            onClick(evt);
        }

        element.addEventListener('click', listener);
        element.addEventListener('keypress', listener);
    },
    formatDate: function(date) {
        let d = new Date(date),
            month = "" + (d.getMonth() + 1),
            day = "" + d.getDate(),
            year = d.getFullYear();

        if (month.length < 2) month = "0" + month;
        if (day.length < 2) day = "0" + day;

        return [year, month, day].join("-");
    },
    getImageUrl: function(product, shopifyVariantId = null) {
        const store = {{ store | json }};
        let imageSrc;

        if (
            product &&
            Object.keys(product).length > 0
        ) {
            const { variants, images } = product.shopify_details;

            if (store.external_platform === 'big_commerce') {
                if (product && images && images[0] && images[0].src) {
                    imageSrc = images[0].src;
                }  else {
                    imageSrc =
                        "//rechargeassets-bootstrapheroes-rechargeapps.netdna-ssl.com/static/images/no-image.png";
                }
            } else {
                if ( 
                    product && 
                    images && 
                    images[0] && 
                    images[0]['src'] 
                ) {
                    if (shopifyVariantId !== null) {
                        const currentVariant = variants.find(
                            variant => variant.shopify_id == shopifyVariantId
                        );

                        if (currentVariant) {
                            let variantImage = images.find(
                                image => image.shopify_id == currentVariant.shopify_image_id
                            );
                            if (variantImage != null) {
                                imageSrc = variantImage.src;
                            } else {
                                imageSrc = images[0]["src"];
                            }
                        } else {
                            imageSrc = images[0]["src"];
                        }
                    } else {
                        imageSrc = images[0]["src"];
                    }
                } else {
                    imageSrc =
                        "//rechargeassets-bootstrapheroes-rechargeapps.netdna-ssl.com/static/images/no-image.png";
                }
            }
        } else {
            imageSrc =
                "//rechargeassets-bootstrapheroes-rechargeapps.netdna-ssl.com/static/images/no-image.png";
        }

        return imageSrc;
    },
    toggleSubscriptionUI: function() {
        let productScheduleContainer = document.querySelector("#product_schedule_container");

        if (
            document.querySelector('[name="purchase_type"]:checked').value ===
                "onetime"
        ) {
            productScheduleContainer.style.display =
                "none";
        } else {
            productScheduleContainer.style.display =
                "block";
        }
    },
    updateFormAction: function() {
        let subscriptionForm = document.querySelector("#subscriptionNewForm");

        if (
            document.querySelector('[name="purchase_type"]:checked').value ===
                "onetime"
        ) {
            subscriptionForm
                .setAttribute("action", "{{ onetime_list_url }}");

            document
                .querySelector('#js-add-product-redirect')
                .value = "{{ schedule_url }}";

        } else {
            subscriptionForm
                .setAttribute("action", "{{ subscription_list_url }}");

            document
                .querySelector('#js-add-product-redirect')
                .value = window.location.href;
        }
    },
    optionChangeCallback: function(evt) {
        // Trigger the variant change callback to ensure correct price display
        ReCharge.Novum.Helpers.triggerVariantUpdate();
        ReCharge.Novum.Utils.toggleSubscriptionUI();
        ReCharge.Novum.Utils.updateFormAction();
    },
    informCustomerHandler: function(evt) {
        evt.preventDefault();
        const value = evt.target.value;

        if (value === "ok") {
            document.querySelector("body").classList.toggle("locked");
            document
                .querySelectorAll(".info-modal")
                .forEach(el => el.setAttribute("style", "display: none;"));
        } else if (value === "cancel") {
            window.close();
        }
    },
    getCurrency: function() {
        let moneySign = 'USD';

        const store = {{ store | json }};

        if (store.currency) {
            moneySign = store.currency;
        } else {
            const price = `{{ 0.00 | money_localized }}`;
            const pattern = (/([\D|a-z]+)/);
            let priceSign = price.match(pattern);

            moneySign = priceSign[0];
        }

        switch (moneySign) {
            case 'USD':
            case 'AUD':
            case 'CAD':
                moneySign = '$';
                break;
            case 'GBP':
                moneySign = '£';
                break;
            case 'EUR':
                moneySign = '€';
                break;
            case 'INR':
                moneySign = '?';
                break;
            case 'SEK':
                moneySign = 'kr';
                break;
            case 'JPY':
                moneySign = '¥';
                break;
            default:
                moneySign = moneySign;
        }

        return moneySign;
    },
    getZipLabel: function(country = "United States") {
        let zipLabel, provinceLabel;

        if (country === "US" || country === "United States") {
            zipLabel = `{{ 'zip_code' | t }}`;
            provinceLabel = `{{ 'Province_State' | t }}`;
        } else if (country === "UK" || country === "United Kingdom") {
            zipLabel = `{{ 'cp_post_code' | t }}`;
            provinceLabel = `{{ 'cp_region' | t }}`;
        } else {
            zipLabel = `{{ 'Postal_Code' | t }}`;
            provinceLabel = `{{ 'cp_region' | t }}`;
        }

        let labels = document.querySelectorAll(".js-zipcode");
        if (labels) {
            labels.forEach(zip => {
                zip.innerHTML = zipLabel;
            });
        }

        let stateLabels = document.querySelectorAll('.js-statelabel');
        if (stateLabels) {
            stateLabels.forEach(state => {
                state.innerHTML = provinceLabel;
            });
        }
    },
    isPrepaid: function(subscription) {
        return subscription.is_prepaid;
    },
    isPrepaidProduct: function(products){ 
        return products.filter(prod => {
            if (prod.subscription_defaults) {
                if (prod.subscription_defaults.order_interval_frequency_options.length === 1) {
                    return prod.subscription_defaults.charge_interval_frequency === Number(prod.subscription_defaults.order_interval_frequency_options[0])
                }

                return products;
            }
        })
    },
    getNumberSuffix: function(num) {
        let j = num % 10;
        let k = num % 100;

        if (j == 1 && k != 11) {
            return `{{ 'cp_st_suffix' | t }}`;
        }
        if (j == 2 && k != 12) {
            return `{{ 'cp_nd_suffix' | t }}`;
        }
        if (j == 3 && k != 13) {
            return `{{ 'cp_rd_suffix' | t }}`;
        }
        return `{{ 'cp_th_suffix' | t }}`;
    },
    renderSubOnetimes: function(products) {
        return products.map(prod => {
            const { product, shopify_variant_id, product_title, status, variant_title, quantity, price } = prod;

            return `
                <div class="display-flex">
                    <div class="rc_photo_container margin-right-20 margin-bottom-10">
                        <img src="${ReCharge.Novum.Utils.getImageUrl(product, shopify_variant_id)}" alt="${product_title.replace('Auto renew', '')}">
                    </div>

                    <div class="rc_schedule_wrapper">
                        <div class="rc_order_title_container">
                            <span class="rc_order_title">${product_title.replace('Auto renew', '')}</span>
                        </div>

                        <p>
                            ${status == "ACTIVE" ? `{% include '_subscription-icon.svg' %} {{ "cp_subscription" | t }}` :
                            `{% include '_onetime-icon.svg' %} {{ 'cp_onetime' | t }}`
                            }
                        </p>

                        ${!variant_title ? '' :
                            `<p>${variant_title}</p>`
                        }

                        <p>
                            {{ 'Quantity' }}: ${quantity}
                        </p>

                        <p class="text-font-14">
                            ${ReCharge.Novum.Utils.getCurrency()}${price.toFixed(2)}
                        </p>
                    </div>
                </div>
            `;
        }).join('');
    },
    triggerSingleProductUpdate: function(evt, actionUrl, name, value) {
        ReCharge.Forms.toggleSubmitButton(evt.target);
        const dataToSend = { date: value };
        ReCharge.Actions.put('update_next_charge_date', actionUrl, dataToSend);
    },
    bulkUpdateOnetimes: async function(event, name, value, url) {
        event.preventDefault();
        ReCharge.Forms.toggleSubmitButton(event.target);

        if (window.locked) { return false; } else { window.locked = true; };
        const onetimes = JSON.parse(sessionStorage.getItem("rc_onetimes"));
        const data = { next_charge_scheduled_at: value };
        let subOnetimes;

        subOnetimes = onetimes
            .filter( otp =>
                otp.next_charge_scheduled_at === ReCharge.Novum.subscription.next_charge_scheduled_at &&
                otp.address_id === ReCharge.Novum.subscription.address_id
            );

        try {
            await axios({
                url,
                method: "post",
                data: { date: value }
            });

            syncUpload.upload(subOnetimes, data, 'onetime_charge_date_url');

        } catch (error) {
            console.error(error.response.data.error);
            ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ "cp_unable_to_perform_update" | t }}`);
            ReCharge.Forms.toggleSubmitButton(event.target);
        } finally {
            delete window.locked;
        }
    },
    bulkCancelAddonProducts: async function(evt, url) {
        evt.preventDefault();
        ReCharge.Forms.toggleSubmitButton(evt.target.querySelector('button'));

        if (window.locked) { return false; } else { window.locked = true; };

        const { id, next_charge_scheduled_at, address_id } = ReCharge.Novum.subscription;
        let onetimes = JSON.parse(sessionStorage.getItem("rc_onetimes"));

        const onetimesToCancel = onetimes
            .filter(otp =>
                otp.next_charge_scheduled_at === next_charge_scheduled_at &&
                otp.address_id === address_id
            )
            .filter(otp => {
                if (otp.properties.length) {
                    let propertiesAsString = JSON.stringify(otp.properties);
                    if (
                        propertiesAsString.includes('add_on_subscription_id') &&
                        propertiesAsString.includes(id)
                    ) {
                        return otp;
                    } else if (
                        propertiesAsString.includes('add_on') &&
                        propertiesAsString.includes('True')
                    ) {
                        return otp;
                    }
                }
            }
        );

        try {
            await axios({
                url,
                method: "post",
                data: {
                    'cancellation_reason': document.querySelector('[name=cancellation_reason]').value,
                    'cancellation_reason_comments': document.querySelector('[name=cancellation_reason_comments]').value || ''
                }
            });

            if (onetimesToCancel.length) {
                syncUpload.upload(onetimesToCancel, null, 'cancel_onetime_product', true);
            } else {
                window.location.href = "{{ subscription_list_url }}";            
            }


        } catch (error) {
            console.error(error);
            ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ 'cp_unable_to_perform_update' | t }}`);
            ReCharge.Forms.toggleSubmitButton(evt.target);
        } finally {
            delete window.locked;
        }
    },
    checkInventory: function(variant) {
        const { inventory_management, inventory_quantity } = variant;
        // Check if store is not tracking inventory
        if (!inventory_management || inventory_management === 'none') {
            return true;
        }
        // Check ReCharge checkout inventory settings
        return inventory_quantity > 0
            ? true
            : ReCharge.Novum.settings.customer_portal.inventory_behaviour !== 'decrement_obeying_policy';
    },
    getAvailableVariants: function(product) {
        let variants = product.shopify_details.variants;

        return variants.filter(variant =>
            ReCharge.Novum.Utils.checkInventory(variant)
        );
    },
    renderOrderFrequencyOptions: function(unit, frequency) {
        let output = '';

        if (unit === 'day') {
            output = Array.from({length: 90},(_,x) => `<option value="${x + 1}" ${x + 1 == frequency ? 'selected' : ''}>${x + 1}</option>`);
        } else if (unit === 'week') {
            output = Array.from({length: 52},(_,x) => `<option value="${x + 1}" ${x + 1 == frequency ? 'selected' : ''}>${x + 1}</option>`);
        } else if (unit === 'month') {
            output = Array.from({length: 12},(_,x) => `<option value="${x + 1}" ${x + 1 == frequency ? 'selected' : ''}>${x + 1}</option>`);
        }

        return output;
    },
    translateOrderIntervalUnit: function(orderIntervalUnit, frequency) {
        const unit = orderIntervalUnit.toLowerCase();
        const freq = Number(frequency);

        if (unit.includes('day')) {
            return freq === 1
                ? `{{ 'Day' | t }}`
                : `{{ 'Days' | t }}`;
        } else if (unit.includes('week')) {
            return freq === 1
                ? `{{ 'Week' | t }}`
                : `{{ 'Weeks' | t }}`;
        } else if (unit.includes('month')) {
            return freq === 1
                ? `{{ 'Month' | t }}`
                : `{{ 'Months' | t }}`;
        } else {
            return unit;
        }
    },
    translateMonth: function(unit) {
        const month = unit.toLowerCase();

        if (month.includes('january')) {
            return `${month.replace('january', `{{ 'January' | t }}` )}`;
        } else if(month.includes('february')) {
            return `${month.replace('february', `{{ 'February' | t }}`)}`;
        } else if(month.includes('march')) {
            return `${month.replace('march', `{{ 'March' | t }}`)}`;
        } else if(month.includes('april')) {
            return `${month.replace('april', `{{ 'April' | t }}`)}`;
        } else if(month.includes('may')) {
            return `${month.replace('may', `{{ 'May' | t }}`)}`;
        } else if(month.includes('june')) {
            return `${month.replace('june', `{{ 'June' | t }}`)}`;
        } else if(month.includes('july')) {
            return `${month.replace('july', `{{ 'July' | t }}`)}`;
        } else if(month.includes('august')) {
            return `${month.replace('august', `{{ 'August' | t }}`)}`;
        } else if(month.includes('september')) {
            return `${month.replace('september', `{{ 'September' | t }}`)}`;
        } else if(month.includes('october')) {
            return `${month.replace('october', `{{ 'October' | t }}`)}`;
        } else if(month.includes('november')) {
            return `${month.replace('november', `{{ 'November' | t }}`)}`;
        } else if(month.includes('december')) {
            return `${month.replace('december', `{{ 'December' | t }}`)}`;
        } else {
            return unit;
        }
    },
    getLocalDate: function(
        rawDate,
        options = { year: 'numeric', month: 'long', day: 'numeric' }
    ) {
        if (!rawDate) {
            return '';
        }
        let date = rawDate;
        if (typeof rawDate === 'string') {
            date = new Date(rawDate);
        }
        return new Intl.DateTimeFormat('default', options).format(date);
    },
    addProductDetailsHandler: async function(ev) {
        ev.preventDefault();

        const productId = ev.target.dataset.productId;
        const schema = ReCharge.Schemas.products.getProduct(productId);
        const data =  await ReCharge.Actions.getProducts(6, schema);

        ReCharge.Novum.sidebarHeading.innerHTML = `{{ 'cp_edit_details' | t }}`;
        ReCharge.Novum.sidebarContent.innerHTML = `{% include '_add_product_details.html' %}`;
      
        renderAddProductDetails(data.products[0]);
    },
    createProduct: async function(evt, shopifyId, message = 'create', variants) {
        evt.preventDefault();

        let url = evt.target.getAttribute('action');
        url = attachQueryParams(url);
        const submitBtn = evt.target.querySelector('[type="submit"]');
        const formEntries = new FormData(evt.target).entries();
        const data = Object.assign(
            ...Array.from(
                formEntries,
                ([key, value]) => (
                    { [key] : value }
                )
            )
        );
      
        if (
            data['purchase_type'] && 
            data['purchase_type'] === 'onetime'
        ) {
            delete data['order_interval_unit'];
            delete data['charge_interval_frequency'];
            delete data['order_interval_frequency'];
        }

        const chosenVariant = variants.find(
            variant => variant.shopify_id == data["shopify_variant_id"]
        );

       const isInStock = ReCharge.Novum.Utils.checkInventory(chosenVariant);

        if (!isInStock) {
            submitBtn.disabled = true;
            submitBtn.textContent = `{{ 'cp_out_of_stock' | t }}`;
            ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ 'cp_product_out_of_stock' | t }}`);
        } else {
            ReCharge.Forms.toggleSubmitButton(submitBtn);
            try {
                await axios({
                    url,
                    method: "post",
                    data
                });

                if (message === 'create') {
                    ReCharge.Toast.addToast(
                        `{{ 'cp_toast_success' | t }}`,
                        `{{ 'cp_product_created_successfully' | t }}`
                    );
                } else {
                    ReCharge.Toast.addToast(
                        `{{ 'cp_toast_success' | t }}`,
                        `{{ 'cp_swapped_product_successfully' | t }}`
                    );
                }

                if (data.redirect_url) {
                    window.location.href = data.redirect_url;
                } else {
                    window.location.reload();
                }
            } catch (error) {
                console.error(error);
                if (message === 'create') {
                    ReCharge.Toast.addToast(
                        `{{ 'cp_toast_error' | t }}`,
                        `{{ 'cp_unable_to_create_product' | t }}`
                    );
                } else {
                    ReCharge.Toast.addToast(
                        `{{ 'cp_toast_error' | t }}`,
                        `{{ 'cp_unable_to_swap_product' | t }}`
                    );
                }
                submitBtn.disabled = true;
            }
        }
    }
}

const syncUpload = {
    queue: [],
    upload: async function (otps, data, typeUrl, redirect = false) {
        otps.forEach(otp => {
            let url = ReCharge.Endpoints[typeUrl]([otp.id]);

            let request = {
                url,
                method: "post",
                data
            }

            this.queue.push(request);
        });

        this.uploadNext(redirect);
    },
    uploadNext: async function (redirect = false) {
        let queue = this.queue;
        if (queue && queue.length) {
            try {
                await axios(queue.shift(0));
                this.uploadNext(redirect);
            } catch (error) {
                console.error(error);
                ReCharge.Toast.addToast(`{{ 'cp_toast_error' | t }}`, `{{ 'cp_unable_to_perform_update' | t }}`);
                //ReCharge.Forms.toggleSubmitButton(event.target);
            }
        } else {
            ReCharge.Toast.addToast(`{{ 'cp_toast_success' | t }}`, '{{ "cp_updates_saved_successfully" | t }}');

            if(redirect){
                window.location.href = "{{ schedule_url }}";
            }else{
                window.location.reload();
            }
        }
    }
}

ReCharge.Novum.Pagination = {
    currentUpsellPage: 1,
    currentAddPage: 1,
    type: 'add',
    limit: 6,
    hasPrevMeta: function(type) {
        if (type === 'add') {
            return ( 
                ReCharge.Novum.addMeta &&
                ReCharge.Novum.addMeta.previous
            )
        }

        return (
            ReCharge.Novum.upsellMeta &&
            ReCharge.Novum.upsellMeta.previous
        )
    },
    hasNextMeta: function(type) {
        if (type === 'add') {
            return ( 
                ReCharge.Novum.addMeta &&
                ReCharge.Novum.addMeta.next
            )
        }

        return (
            ReCharge.Novum.upsellMeta &&
            ReCharge.Novum.upsellMeta.next
        )
    },
    previousPageHandler: function(ev) {     
        const handlerType = ev.target.closest('[data-handler-type]').dataset.handlerType;

        if (this.hasPrevMeta(handlerType)) {
            if (handlerType === 'add') {
                url = ReCharge.Novum.addMeta.previous;
                this.currentAddPage > 1
                    ? this.currentAddPage -= 1
                    : ''
                ;
            } else {
                url = ReCharge.Novum.upsellMeta.previous;
                this.currentUpsellPage > 1
                    ? this.currentUpsellPage -= 1
                    : ''
                ;
            } 
            this.goToPageHandler(
                handlerType,
                ev,
                url
            );
        }
    },
  	previousPageHandlerAdd: function(ev) {
        const handlerType = ev.target.closest('[data-handler-type]').dataset.handlerType;      	
        if (handlerType === 'add') {
          this.currentAddPage > 1
            ? this.currentAddPage -= 1
          : ''
          ;
        }
        this.goToPageHandlerAdd(
          handlerType,
          ev
        );
    },
    nextPageHandler: function(ev) {
      console.log(" -------- nextPageHandler called ---");
        const handlerType = ev.target.closest('[data-handler-type]').dataset.handlerType;
        if (this.hasNextMeta(handlerType)) { 
            let url = '';
            if (handlerType === 'add') {
                url = ReCharge.Novum.addMeta.next;
                this.currentAddPage += 1;
            } else {
                url = ReCharge.Novum.upsellMeta.next;
                this.currentUpsellPage += 1;
            }     
            this.goToPageHandler(
                handlerType,
                ev,
                url
            );
        }
    },
  	nextPageHandlerAdd: function(ev) {
        const handlerType = ev.target.closest('[data-handler-type]').dataset.handlerType;      	
      	this.currentAddPage += 1;
      	this.goToPageHandlerAdd(
          handlerType,
          ev
        );
    },
    goToPageHandler: async function(handlerType, ev, url) {
        this.disableButtons(handlerType);
        this.type = handlerType;

        let schema = ReCharge.Schemas.products.list(6, `upsell_product`);

        if (handlerType === 'upsell') {
            const data =  await ReCharge.Actions.getProducts(12, schema, url);
            ReCharge.Novum.Helpers.renderUpsells(data.products);
        } else {
            let type = 'add';
            if (ReCharge.Novum.isSwap) {
                ev.target.closest('[data-handler-type]').dataset.handlerType;
                type = 'swap';
            }
            schema = ReCharge.Schemas.products.list(6, `${type}_product`);

            const data =  await ReCharge.Actions.getProducts(6, schema, url);
            ReCharge.Novum.Helpers.renderProducts(data.products, type);
        }
        
        const page = handlerType === 'upsell' 
            ? this.currentUpsellPage 
            : this.currentAddPage;

        this.updateButtonState(handlerType);

        this.updateCurrentPageNumber(page, handlerType);
    },
  	goToPageHandlerAdd: async function(handlerType, ev, requestedActionType = 'add_product') {
        this.disableButtons(handlerType);
        this.type = handlerType;
        
        let type = 'add';
        if (ReCharge.Novum.isSwap) {
          ev.target.closest('[data-handler-type]').dataset.handlerType;
          type = 'swap';
        }
      
      	//-
      	const rc_search = document.getElementById("rc_search");
      	const searchQuery = rc_search.value
          .trim()
          .toLowerCase()
          .replace(/"/g, '')
        ;
      	const actionType = type === 'add'
          ? 'add_product'
          : 'swap_product'
        ;
      	const schema = ReCharge.Schemas.products.search(searchQuery, null, null, actionType);
      	
      	let dataUrl = attachQueryParams(`
            ${ReCharge.Endpoints.request_objects()}&schema=${schema}`
        );
      	try {
          const response = await axios(dataUrl);
          
          let subscriptionRechargeIdArr = [];
          const rc_subscriptions = JSON.parse(sessionStorage.getItem('rc_subscriptions')) || null;
          if (rc_subscriptions != null ) {
            for(let subscription of rc_subscriptions) {
              subscriptionRechargeIdArr.push(subscription.recharge_product_id);
            }
          }
          
          const productsNotInSubscription = response.data.products.filter(product =>{
              return subscriptionRechargeIdArr.indexOf(product.id) === -1;
          });
          
          const products =  productsNotInSubscription.slice((this.currentAddPage - 1) * this.limit, this.currentAddPage * this.limit);          
          ReCharge.Novum.Helpers.renderProductsNIS(products, type);
        
          const page = this.currentAddPage;
          
          this.updateButtonStateAdd(handlerType, productsNotInSubscription.length);
          this.updateCurrentPageNumber(page, handlerType);
          
        } catch(error) {
            console.error(error);
            return [];
        } finally {
            delete window.locked;
        }
    },
    disableButtons: function(type) {
        document
            .querySelector(`.rct_pagination__prev--${type}`)
            .classList.add('rct_pagination__prev--disabled');

        document
            .querySelector(`.rct_pagination__next--${type}`)
            .classList.add('rct_pagination__next--disabled');
    },
    enableButtons: function(type) {
        document
            .querySelector(`.rct_pagination__prev--${type}`)
            .classList.remove('rct_pagination__prev--disabled');

        document
            .querySelector(`.rct_pagination__next--${type}`)
            .classList.remove('rct_pagination__next--disabled');  
    },
    updateButtonState(type) {
        const prevBtnAction = this.hasPrevMeta(type) ? 'remove' : 'add';
        const nextBtnAction = this.hasNextMeta(type) ? 'remove' : 'add';

        document
            .querySelector(`.rct_pagination__prev--${type}`)
            .classList[prevBtnAction]('rct_pagination__prev--disabled');

        document
            .querySelector(`.rct_pagination__next--${type}`)
            .classList[nextBtnAction]('rct_pagination__next--disabled');
    },
  	updateButtonStateAdd(type, productsCount) {
        const prevBtnAction = this.currentAddPage > 1 ? 'remove' : 'add';      	
        const nextBtnAction = productsCount > (this.limit * this.currentAddPage) ? 'remove' : 'add';
      	
        document
            .querySelector(`.rct_pagination__prev--${type}`)
            .classList[prevBtnAction]('rct_pagination__prev--disabled');

        document
            .querySelector(`.rct_pagination__next--${type}`)
            .classList[nextBtnAction]('rct_pagination__next--disabled');
    },
    updateCurrentPageNumber: function(page = null, type) {
        if (ReCharge.Novum.isSwap) {
            document
                .querySelector(`.rct_pagination__current--${type}`)
                .innerText = page;
            return;
        }

        return document
            .querySelector(`.rct_pagination__current--${type}`)
            .innerText = page;
    },
    toggle: function(shouldShow = null) {
        if (shouldShow) {
            return document
                .querySelector(`.rct_pagination__container--${this.type}`)
                .classList.remove('rct_pagination__container--hidden');
        }

        document
            .querySelector(`.rct_pagination__container--${this.type}`)
            .classList.add('rct_pagination__container--hidden');
    },
    updatePagination: function() {
        this.currentAddPage = 1;
        this.updateButtonState('add');
        this.updateCurrentPageNumber(this.currentAddPage, 'add');
        if (!this.hasNextMeta(this.type)) {
           return this.toggle();
        }         
    },
  	updatePaginationAdd: function(productsCount) {
        this.currentAddPage = 1;
        this.updateButtonStateAdd('add', productsCount);
        this.updateCurrentPageNumber(this.currentAddPage, 'add');        
    },
    renderInitialPagination: function() {
        let page = this.currentAddPage;
        if (ReCharge.Novum.Pagination.type === 'upsell') {
            page = this.currentUpsellPage
        }

        if (
            page === 1 &&
            !this.hasNextMeta(this.type)
        ) {
            this.toggle();
        } else {
            this.toggle(true);
        }
    },
    updateBtnProps: function(type) {
        let btn = document.querySelector(`.rct_pagination__${type}--add`);
        if (btn) {
            btn.classList.remove(`rct_pagination__${type}--add`);
            btn.classList.add(`rct_pagination__${type}--upsell`);
            btn.dataset.handlerType = 'upsell';
        }
    }
}
