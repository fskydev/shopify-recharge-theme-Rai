// Open modal to show all products
async function addProductHandler(evt) {
    evt.preventDefault();

    // Hide back button
    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: hidden');

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ 'cp_select_product' | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `{% include '_render_products.html' %}`;

    const data =  await ReCharge.Actions.getProducts(6);
    const productsToRender = data.products;

    ReCharge.Novum.Pagination.currentAddPage = 1;
    ReCharge.Novum.Pagination.limit = 6;
    ReCharge.Novum.Pagination.type = 'add';    
    ReCharge.Novum.Helpers.renderProducts(productsToRender, 'add');

    let input = document.getElementById('rc_search');
    input.addEventListener('keyup', ReCharge.Novum.Helpers.searchProductsHandler);

    ReCharge.Novum.toggleSidebar();
}

// Render product details info to add
function renderAddProductDetails(product) {
    const storeSettings = {{ settings | json }};
    const addresses = ReCharge.Novum.addresses;

    let addressOutput, expire_after_specific_number_of_charges;

    addresses.forEach(address => {
        addressOutput += `
            <option value="${address.id}">
                ${address.first_name} ${address.last_name} ${address.address1} ${address.address2}
            </option>
        `;
    });

    const productContainer = document.querySelector('.rc_add_product_details_container');

    if (
        product.subscription_defaults &&
        Object.keys(product.subscription_defaults).length > 0 &&
        product.subscription_defaults.expire_after_specific_number_of_charges
    ) {
        expire_after_specific_number_of_charges = `
            <input
                type="hidden"
                name="expire_after_specific_number_of_charges"
                value="${product.subscription_defaults.expire_after_specific_number_of_charges}"
            >
        `;
    } else {
        expire_after_specific_number_of_charges = '';
    }

    const { shopify_id, variants } = product.shopify_details;
    const shouldDisplayVariants =  variants.length > 1 || variants.length === 1 && variants[0].title !== 'Default Title';

    productContainer.innerHTML += `
        ${ ReCharge.Novum.store.external_platform === 'big_commerce'
            ? `<input type="hidden" name="external_product_id" value="${ shopify_id }">`
            : ``
        }
        <input type="hidden" name="shopify_variant_id" value="${ variants[0].shopify_id }">
        <input type="hidden" name="redirect_url" value="{{ schedule_url }}">
        <input type="hidden" id="js-add-product-redirect" name="redirect_url" value="{{ subscription_list_url }}">
        
        ${expire_after_specific_number_of_charges}

        ${ReCharge.Novum.Helpers.renderSubscriptionProductInfo(
            product,
            ReCharge.Novum.Helpers.getDisplayPrice(product)
        )}
        ${ ReCharge.Novum.Helpers.renderPurchaseOptions(product, storeSettings) }

        <div id="product_schedule_container">
            ${ ReCharge.Novum.Helpers.renderDeliveryOptions(product) }
        </div>

        <div id="shipping_address_container">
            <label class="text-font-14"> {{ 'ships_to' | t }} </label>
        </div>

        <div id="product_variant_container" ${shouldDisplayVariants ? '' : `style="display: none;"`} >
            <p class="text-font-14"> {{ 'cp_variants' | t }} </p>
            <ul id="product_options_container"></ul>
        </div>

        <div id="product_dates_container"></div>

        <div id="next_charge_date_container"style="display: none;">
            <br>
            <label class="text-font-14"> {{ 'cp_date_format' | t }}: DD-MM-YYYY </label>
            <br>
            <input
                class="margin-top-8 border-light"
                type="date"
                name="next_charge_scheduled_at"
                id="next_charge_scheduled_at"
                required
            >
        </div>
        <br>
        <button type="submit" class="rc_btn text-uppercase title-bold"> {{ 'Add_product' | t }} </button>
    `;

    let addressesContainer = document.querySelector('#shipping_address_container');

    addressesContainer.innerHTML = `
        ${addresses.length < 1
            ? `<span class="color-gray">No address on file.</span>
                <a href="{{ shipping_list_url if settings.customer_portal.view_recharge_payment_methods else address_list_url}}" class="text-uppercase title-bold color-turquoise-blue";">
                    {{ 'cp_add_an_address' | t }}
                </a>`
            : `<label for="address_id" class="text-font-14"> {{ 'ships_to' | t }} </label>
               <select
                    class="margin-top-8"
                    name="address_id"
                    id="address_id"
                    onchange="ReCharge.Novum.Helpers.updateNextChargeDate(this);"
               >
                    ${addressOutput}
               </select>`
        }
    `;


    ReCharge.Novum.Helpers.renderVariants(product);
    ReCharge.Novum.Utils.toggleSubscriptionUI();
    ReCharge.Novum.Utils.updateFormAction();
    ReCharge.Novum.Helpers.updateNextChargeDate();

    // Trigger the variant change callback to ensure correct price display
    ReCharge.Novum.Helpers.triggerVariantUpdate();

    // Show back button
    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: visible');
    // Place onclick event to go back and show product list
    ReCharge.Novum.backBtn.addEventListener('click', addProductHandler);

    // Add handler for subscription/otp creation
    document
        .querySelector('#subscriptionNewForm')
        .addEventListener(
            'submit',
            (e) => ReCharge.Novum.Utils.createProduct(
                e, 
                product.shopify_details.shopify_id,
                'create',
                product.shopify_details.variants
            )
        );
}

function reactivateSubscriptionHandler(evt) {
    evt.preventDefault();

    const subscriptionId = evt.target.dataset.id;
    const actionUrl = ReCharge.Endpoints.activate_subscription_url(subscriptionId);
    const redirectUrl = ReCharge.Endpoints.update_subscription_url(subscriptionId);

    // Hide back button
    ReCharge.Novum.backBtn.setAttribute('style', 'visibility: hidden;');

    ReCharge.Novum.sidebarHeading.innerHTML = `{{ "cp_reactivate_subscription" | t }}`;
    ReCharge.Novum.sidebarContent.innerHTML = `
        <form action="${actionUrl}" method="post" id="ReChargeForm_activate">
            <input type="hidden" name="redirect_url" value="${redirectUrl}">
            <p class="text-font-14"> {{ 'cp_your_subscription_will_be_reactivated' | t }} </p>
            <br>
            <button type="submit" class="rc_btn"> {{ 'Re-activate' | t }} </button>
        </form>
    `;

    ReCharge.Novum.toggleSidebar();
}
