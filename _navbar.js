(function() {
    // Select current menu option for mobile version
    const pageUrl = window.location.pathname;
    const isHostedPortal = {{ settings | json }}.customer_portal.hosted_customer_portal;
    let currentPage = pageUrl.split("/")[5];

    if (isHostedPortal) {
        currentPage = pageUrl.split("/")[3];
    }

    if (pageUrl.includes(currentPage)) {
        let menuOption = document.querySelector(`#${currentPage}-page`);
        let chosen = document.querySelector(".chosen-title");

        if (menuOption) {
            chosen.textContent = menuOption.textContent
        }
    }

    // Add on click event that will toglle mobile menu
    document
        .querySelector(".list_item_chosen")
        .addEventListener("click", toggleMobileMenuHandler);

    // Toggle mobile menu
    function toggleMobileMenuHandler(event) {
        const parentEl = event.target.closest(".list_item_chosen");
        const arrow = parentEl.dataset.arrow;
        let navWrapper = document.querySelector(".nav--wrapper");
        navWrapper.classList.toggle("nav--wrapper--margin");

        let arrowDown = document.querySelector(".arrow-down");
        arrowDown.classList.toggle("arrow--hide");
        let arrowUp = document.querySelector(".arrow-up");
        let mobileMenu = document.querySelector(".nav__list--mobile");

        if (arrow === "down") {
            arrowUp.setAttribute("style", "display: inline-block;");
            mobileMenu.classList.toggle("menu--active");
            parentEl.dataset.arrow = "up";
        } else {
            arrowUp.setAttribute("style", "display: none;");
            mobileMenu.classList.toggle("menu--active");
            parentEl.dataset.arrow = "down";
        }
    }
})();