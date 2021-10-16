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

	/* nav menu start */

	var currentIndex = 0;
	var newIndex = 0;
	var slidesLength = 2;

	var pagination = document.getElementsByClassName("slider_pagination")[0];
	console.log(" -------- pagination => ", pagination);
	if(pagination) {
      pagination.onclick = function(e) {
         var target = e.target;
         if (target.classList.contains("slider_pagination_btn")) {
            newIndex = Number(target.getAttribute("data-index"));
           	console.log(" -------- newIndex => ", newIndex);
            navigateSlider();
         }
      }
    }

	var sideMenuEls = document.getElementsByClassName("side-menu-value");
		if(sideMenuEls.length > 0) {
		console.log(sideMenuEls);
		var sideMenu = sideMenuEls[0].dataset.sideMenu;          	
	  	// var sideMenuEl = document.getElementById(sideMenu);
        var sideMenuEls = document.getElementsByClassName(sideMenu);
        /*          
        console.log(" -------- sideMenu => ", sideMenu);
        console.log(" -------- sideMenuEl => ", sideMenuEl);
  		*/
	  	if(sideMenuEls.length > 0){
          for(let sideMenuEl of sideMenuEls) {
            sideMenuEl.classList.add("title-bold");
          	sideMenuEl.parentNode.classList.add("menu-nav-active");
          }
          
          //nav mobile init
          var indexMenu = Array.prototype.indexOf.call(sideMenuEls[1].parentNode.parentNode.children, sideMenuEls[1].parentNode);
          console.log(" -------- indexMenu => ", indexMenu);
          
          newIndex = Math.floor(indexMenu / 3);
          navigateSlider();
          
	    }
	}
	
	function navigateSlider() {
      if (newIndex === -1) newIndex = slidesLength - 1;
      else if (newIndex === slidesLength) newIndex = 0;
      
      pagination.children[currentIndex].classList.remove("slider_pagination_btn--sel");
      pagination.children[newIndex].classList.add("slider_pagination_btn--sel");
      
      let mobileMenus = document.querySelectorAll(".nav__slider--mobile .nav__list--mobile > li");
      let elScroll = document.querySelector(".nav__slider--mobile .nav__list--mobile");
      for(let i=0;i < mobileMenus.length;i++) {
        //mobileMenus[i].dataset.index = Math.floor(i / 3);
        
        /*
        if(currentIndex == Math.floor(i / 3)){
          mobileMenus[i].style.display = "none";
        } else 
        */
        if(newIndex == Math.floor(i / 3)) {
          mobileMenus[i].style.display = "inline-block";
        } else{
          mobileMenus[i].style.display = "inline-block";
        }
      }
      console.log(" -------- mobileMenus => ", mobileMenus);
      
      if(newIndex == 0){
        elScroll.scroll({          
          left: 0,
          behavior: 'smooth'
        });
      }else{
        elScroll.scroll({          
          left: 1000,
          behavior: 'smooth'
        });
      }
      console.log(" -------- elScroll => ", elScroll);
      
      currentIndex = newIndex;
    }	
	/* nav menu end */
})();