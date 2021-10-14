function configureStore() {
    const settingsStore = {{ settings | json }};
    let store = {{ store | json }};

    // Check if store allows editing shipping address
    const editAddressBtn = document.querySelectorAll(".js-address-edit-btn") || null;
    if (settingsStore.customer_portal.edit_shipping_address) {
        if (editAddressBtn) {
            editAddressBtn.forEach(btn => { ReCharge.Novum.Helpers.showElement(btn) });
            document
                .querySelectorAll(".js-address-edit")
                .forEach(address => {
                    address.addEventListener("click", renderAddressDetailsHandler)
                });
        }
    } else {
        if (editAddressBtn) {
            editAddressBtn.forEach((btn) => ReCharge.Novum.Helpers.showElement(btn));
            document
                .querySelectorAll(".js-address-edit")
                .forEach(address => {
                    ReCharge.Utils.contactStoreWording(
                        address,
                        ReCharge.Utils.renderContactStoreLayout(`{{ 'shipping_addres' | t }}`),
                        `{{ 'cp_edit_address_label' | t }}`
                    );
                });
        }
    }
    // Check if store allows editing next charge date
    const editNextChargeDateBtn = document.querySelector(".js-edit-next-charge-date-btn") || null;
    const nextDeliveryContainer = document.querySelector(".js-edit-next-charge-date") || null;

    if (settingsStore.customer_portal.subscription.edit_scheduled_date) {
        if (editNextChargeDateBtn) {
            ReCharge.Novum.Helpers.showElement(editNextChargeDateBtn);
            nextDeliveryContainer.addEventListener("click", editNextShipment);
        }
    } else {
        if (editNextChargeDateBtn) {
            ReCharge.Novum.Helpers.showElement(editNextChargeDateBtn);
            ReCharge.Utils.contactStoreWording(
                nextDeliveryContainer,
                ReCharge.Utils.renderContactStoreLayout(`{{ 'cp_next_shipment' | t }}`),
                `{{ 'cp_next_shipment' | t }}`
            );
        }
    }
    // Check if store allows editing delivery frequency
    const frequencyBtn = document.querySelector(".js-edit-frequency-btn") || null;
    const frequencyContainer = document.querySelector(".js-edit-frequency") || null;

    if (settingsStore.customer_portal.subscription.edit_order_frequency !== "Prohibited") {
        if (frequencyBtn) {
            ReCharge.Novum.Helpers.showElement(frequencyBtn);
            frequencyContainer.addEventListener("click", editScheduleHandler);
        }
    } else {
        if (frequencyBtn) {
            ReCharge.Novum.Helpers.showElement(frequencyBtn);
            ReCharge.Utils.contactStoreWording(
                frequencyContainer,
                ReCharge.Utils.renderContactStoreLayout(`{{ 'cp_delivery_frequency' | t }}`),
                `{{ 'cp_deliver_every' | t }}`
            );
        }
    }
    // Check if store allows skip
    if (settingsStore.customer_portal.subscription.skip_scheduled_order) {
        const skipBtns = document.querySelectorAll(".js-skip-btn") || null;

        if (skipBtns) {
            skipBtns.forEach(btn => { ReCharge.Novum.Helpers.showElement(btn); });
            document
                .querySelectorAll(".js-skip-handler")
                .forEach(btn => {
                    btn.addEventListener("click", skipShipmentHandler)
                });
        }
        const unskipBtns = document.querySelectorAll(".js-unskip-btn") || null;

        if (unskipBtns) {
            unskipBtns.forEach(btn => { ReCharge.Novum.Helpers.showElement(btn); });
            document
                .querySelectorAll(".js-unskip-handler")
                .forEach(btn => {
                    btn.addEventListener("click", unskipShipmentHandler)
                });
        }
    }
    
    // Check if product on edit subscription page is otp addon
    if (ReCharge.Novum.subscription && ReCharge.Novum.subscription.status == "ONETIME") {
        addOnLayout();
    }
}

function addOnLayout() {
    const { properties } = ReCharge.Novum.subscription;
    let isAddOn;

    if (properties && properties.length) {
        isAddOn = properties.filter(prop => prop.name == "add_on")[0];

        if(isAddOn && isAddOn.name == "add_on") {
            let cards = document.querySelectorAll(".js-edit-next-charge-date, .js-address-edit, .js-edit-billing-address, .js-edit-billing-card");
            cards.forEach(elem => elem.style.pointerEvents = "none");

            let arrows = document.querySelectorAll(".js-edit-next-charge-date-btn, .js-address-edit-btn, .js-billing-edit-btn, .js-billing-card-edit-btn");
            arrows.forEach(arrow => arrow.style.display = "none");
        }
    }
}

function needsToken(address) {
    // Check if the URL requires a token
    if (address.indexOf("{{ shopify_proxy_url if proxy_redirect else '' }}") === -1) {
        return false;
    }
    let url = new URL(address, window.location),
        params = new URLSearchParams(url.search);
        
    return !params.get("token");
}
// Return a string URL with "?token=asd2310&preview_standard_theme=2" or "?token=asd2310&preview_theme=1111" params
// attached if they exist on the current location
function attachQueryParams(address) {
    let url = new URL(address, window.location);
    let params = new URLSearchParams(url.search);
    if (!params.get("token")) {
        if (window.customerToken) {
            params.set("token", window.customerToken);
        }
    }

    let preview_theme = (new URLSearchParams(window.location.search)).get("preview_standard_theme");
    if (preview_theme && !params.get("preview_standard_theme")) {
        params.set("preview_standard_theme", preview_theme);
    }

    let themeEnginePreview = (new URLSearchParams(window.location.search)).get("preview_theme");
    if (themeEnginePreview && !params.get("preview_theme")) {
        params.set("preview_theme", themeEnginePreview);
    }

    if(params.toString() === '') {
        url.search = params.toString().concat('?preview=false');
    } else {
        url.search = params.toString();
    }

    return url.toString();
}

(function() {
    // Apply CSS styles
    document.querySelector("body").setAttribute("id", "recharge-novum");

    ReCharge.Novum.sidebarHeading = document.querySelector("#te-modal-heading span");
    ReCharge.Novum.sidebarContent = document.getElementById("te-modal-content");
    ReCharge.Novum.backBtn = document.querySelector('.js-back-btn');
    ReCharge.Novum.toggleSidebar = function() {
        document.querySelector("body").classList.toggle("locked");
        document.getElementById("sidebar-underlay").classList.toggle("visible");
        document.getElementById("te-modal").classList.toggle("visible");
        document.querySelectorAll(".close-sidebar")
            .forEach(sidebar => {
                sidebar.addEventListener('click', ReCharge.Novum.toggleSidebar);
            })
        ;

        if (ReCharge.Novum.Pagination.type === 'upsell') {
            ReCharge.Novum.Pagination.updateBtnProps('container');
            ReCharge.Novum.Pagination.updateBtnProps('prev');
            ReCharge.Novum.Pagination.updateBtnProps('next');
            ReCharge.Novum.Pagination.updateBtnProps('current');
            ReCharge.Novum.Pagination.limit = 12;
        }
    }
    
    // Trigger configuration code
    configureStore();
    /*==================
      preview link info
    ==================*/
    const currentUrl = window.location.href;
    if (
        currentUrl.includes("preview_standard_theme") ||
        currentUrl.includes("preview_theme")
    ) {
        document
            .querySelectorAll(".info-modal")
            .forEach((el) => el.setAttribute("style", "display: block;"));
        document.querySelector("body").classList.toggle("locked");
    }
    /*===================
      preview link info
    ===================*/

    // Update links with tokens
    document.querySelectorAll("a")
        .forEach(function(el) {
            let url = el.href;
            if (needsToken(url)) {
                el.href = attachQueryParams(el.href);
            }
        });
    // Update forms with tokens
    document.querySelectorAll("form")
        .forEach(function(form) {
            if (form.action && needsToken(form.action)) {
                form.action = attachQueryParams(form.action);
            }
        });
    // Update inputs with tokens
    document.querySelectorAll("input")
        .forEach(function(el) {
            let url = el.value;
            if (needsToken(url)) {
                if (url.includes('/portal')) {
                    el.value = attachQueryParams(el.value);
                }
            }
        });
    // Watch for DOM changes and apply tokens as necessary
    if (MutationObserver && !!document.getElementById("#ReCharge")) {
        let callback = function(mutationsList, observer) {
            mutationsList
                .filter(function(mutation) {
                    return mutation.type === "childList";
                })
                .forEach(function(mutation) {
                    Array.prototype.slice
                        .call(mutation.addedNodes)
                        .filter(function(node) {
                            return node.tagName === "A";
                        })
                        .forEach(function(node) {
                            let url = node.href;
                            if (needsToken(url)) {
                                node.href = attachQueryParams(node.href);
                            }
                        });
                });
        };
        let observer = new MutationObserver(callback);
        observer.observe(document.querySelector("#ReCharge"), {
            attributes: false,
            childList: true,
            subtree: true,
        });
    }
})();
