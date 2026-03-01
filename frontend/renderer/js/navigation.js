/* navigation.js — page switching and tab initialisation */

/* =============================================
   PAGE NAVIGATION
   ============================================= */
const navItems = document.querySelectorAll(".nav-item");
const pages    = document.querySelectorAll(".page");

function showPage(pageId) {
    pages.forEach(function(page) {
        page.classList.add("hidden");
    });

    let target = document.getElementById("page-" + pageId);
    if (target) {
        target.classList.remove("hidden");
    }

    navItems.forEach(function(item) {
        item.classList.remove("active");
        if (item.getAttribute("data-page") === pageId) {
            item.classList.add("active");
        }
    });
}

navItems.forEach(function(item) {
    item.addEventListener("click", function() {
        showPage(item.getAttribute("data-page"));
    });
});

// Default page on load
showPage("input");

/* =============================================
   TECHNICAL REPORT — TABS (top-level & winding sub-tabs)
   ============================================= */
initTabs(".tr-tab",          ".tr-tab-content",      "data-tr-tab",      "tr-");
initTabs(".winding-sub-tab", ".winding-sub-content", "data-winding-tab", "winding-");

/* =============================================
   INPUT PAGE — RUN CALCULATION
   ============================================= */