//DOM EVENT LISTENER-------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", function () {
    
    
// DROPDOWN FUNCTIONS------------------------------------------------

function easeQuadInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function animateGrow(element, duration, callback) {
  element.style.height = "auto";
  const targetHeight = element.offsetHeight;
  element.style.height = "0px";
  element.style.display = "flex";

  let startTime;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = Math.min((timestamp - startTime) / duration, 1);
    element.style.height = (targetHeight * easeQuadInOut(progress)) + "px";
    if (progress < 1) requestAnimationFrame(step);
    else {
      element.style.height = "auto";
      element.style.overflow = "";
      if (callback) callback();
    }
  }
  requestAnimationFrame(step);
}

function animateShrink(element, duration, callback) {
  const startHeight = element.offsetHeight;
  let startTime;
  function step(timestamp) {
    if (!startTime) startTime = timestamp;
    let progress = Math.min((timestamp - startTime) / duration, 1);
    element.style.height = (startHeight * (1 - easeQuadInOut(progress))) + "px";
    if (progress < 1) requestAnimationFrame(step);
    else {
      element.style.height = "0px";
      element.style.overflow = "hidden";
      element.style.visibility = "hidden";
      element.style.display = "none";
      element.removeAttribute("open");
      if (callback) callback();
    }
  }
  requestAnimationFrame(step);
}

function openDropdown(menu) {
  const parentDropdown = menu.closest("[dropdown='true']");
  const toggle = parentDropdown?.querySelector("[dropdown-toggle='true']");
  const icon = toggle?.querySelector("[dropdown-icon='true']");

  menu.style.visibility = "visible";
  menu.style.display = "flex";
  menu.style.overflow = "hidden";
  menu.style.height = "0px";
  menu.setAttribute("open", "");

  toggle?.classList.add("dropdown-open");
  if (icon) {
    icon.style.transition = "transform 250ms ease-in-out";
    icon.style.transform = "rotateX(180deg)";
  }

  animateGrow(menu, 250, () => {
    menu.style.height = "auto";
  });
}

function closeDropdown(menu) {
  const parentDropdown = menu.closest("[dropdown='true']");
  const toggle = parentDropdown?.querySelector("[dropdown-toggle='true']");
  const icon = toggle?.querySelector("[dropdown-icon='true']");

  menu.querySelectorAll("[dropdown-menu='true'][open]").forEach(nested => {
    closeDropdown(nested);
  });

  animateShrink(menu, 250, () => {
    toggle?.classList.remove("dropdown-open");
    if (icon) {
      icon.style.transition = "transform 250ms ease-in-out";
      icon.style.transform = "rotateX(0deg)";
    }
    menu.removeAttribute("open");
  });
}

function toggleDropdown(toggle, event) {
  const parentDropdown = toggle.closest("[dropdown='true']");
  const menu = parentDropdown.querySelector("[dropdown-menu='true']");
  if (!menu) return;

  if (toggle.tagName === "A") event.preventDefault();

  if (menu.hasAttribute("open")) {
    menu.dataset.userClosed = "true";
    closeDropdown(menu);
  } else {
    delete menu.dataset.userClosed;
    openDropdown(menu);
  }
}

// === CLICK EVENTS ===
document.addEventListener("click", e => {
  const toggle = e.target.closest("[dropdown-toggle='true']");
  if (toggle) {
    e.stopPropagation();
    toggleDropdown(toggle, e);
  }
});

document.addEventListener("click", e => {
  if (e.target.closest("[dropdown-menu='true']")) {
    e.stopPropagation();
  }
});

// === HOVER RE-INIT ===
function reinitializeDropdowns() {
  document.querySelectorAll("[dropdown=true]").forEach(dropdown => {
    const menu = dropdown.querySelector("[dropdown-menu='true']");
    const toggle = dropdown.querySelector("[dropdown-toggle='true']");
    if (!toggle || !menu) return;

    const shouldBeOpen = menu.getAttribute("dropdown-state") === "open";
    const containsSelected = menu.querySelector(".selected");

    if (shouldBeOpen || containsSelected) {
      menu.setAttribute("open", "");
      menu.style.visibility = "visible";
      menu.style.display = "flex";
      menu.style.height = "auto";
      toggle.classList.add("dropdown-open");

      const icon = toggle.querySelector("[dropdown-icon='true']");
      if (icon) {
        icon.style.transition = "transform 250ms ease-in-out";
        icon.style.transform = "rotateX(180deg)";
      }
    } else {
      menu.style.height = "0px";
      menu.style.visibility = "hidden";
      menu.style.display = "none";
      menu.removeAttribute("open");
    }

    if (dropdown.hasAttribute("dropdown-hover-out")) {
      dropdown.removeEventListener("mouseleave", hoverOutHandler);
      dropdown.addEventListener("mouseleave", hoverOutHandler);
    }
  });
}

function hoverOutHandler(e) {
  const dropdown = e.currentTarget;
  const menu = dropdown.querySelector("[dropdown-menu='true']");
  if (menu?.hasAttribute("open")) {
    closeDropdown(menu);
  }
}

new MutationObserver(reinitializeDropdowns).observe(document.body, {
  childList: true,
  subtree: true
});

reinitializeDropdowns();

// === .selected Class Observer ===
let lastSelectedId = null;

const observerSelected = new MutationObserver(() => {
  const currentSelected = document.querySelector("[dropdown-item-target].selected");
  if (!currentSelected) return;

  const newId = currentSelected.getAttribute("dropdown-item-target") || currentSelected.id;
  if (newId === lastSelectedId) return; // Nothing changed
  lastSelectedId = newId;

  // Get all dropdown menus that should be open based on the new .selected
  const menusToOpen = new Set();

  let currentMenu = currentSelected.closest("[dropdown-menu='true']");
  while (currentMenu) {
    menusToOpen.add(currentMenu);
    const parentDropdown = currentMenu.closest("[dropdown='true']");
    currentMenu = parentDropdown?.closest("[dropdown-menu='true']");
  }

  // 🔄 Reopen newly needed menus (ignore userClosed only if .selected moved)
  menusToOpen.forEach(menu => {
    if (menu.dataset.userClosed === "true") {
      delete menu.dataset.userClosed;
    }
    if (!menu.hasAttribute("open")) {
      openDropdown(menu);
      menu.dataset.autoOpened = "true";
    }
  });

  // 🔒 Close any other menus that were autoOpened but no longer needed
  document.querySelectorAll("[dropdown-menu='true'][open]").forEach(menu => {
    const isInMenusToOpen = menusToOpen.has(menu);
    const wasAutoOpened = menu.dataset.autoOpened === "true";

    if (wasAutoOpened && !isInMenusToOpen) {
      delete menu.dataset.autoOpened;
      closeDropdown(menu);
    }
  });
});



observerSelected.observe(document.body, {
  attributes: true,
  subtree: true,
  attributeFilter: ["class"]
});

// === Open Menus on First Page Load ===
const selectedEls = Array.from(document.querySelectorAll(".selected")).filter(el =>
  el.closest("[dropdown-tree]")
);
selectedEls.forEach(selected => {
  let currentMenu = selected.closest("[dropdown-menu='true']");
  while (currentMenu) {
    if (!currentMenu.hasAttribute("open")) {
      openDropdown(currentMenu);
      currentMenu.dataset.autoOpened = "true";
    }
    const parentDropdown = currentMenu.closest("[dropdown='true']");
    currentMenu = parentDropdown?.closest("[dropdown-menu='true']");
  }
});

// DROPDOWN FUNCTION ENDS ------------------------------------------------



    


    
    
    
    
        // DARK-MODE TOGGLE------------------------------------------------------------------------            
 
    const toggle = document.getElementById("dark-mode-toggle-primary");

    // Function to apply dark mode immediately
    function applyDarkMode(enabled) {
        const elements = document.querySelectorAll('[dark-mode="true"]');
        elements.forEach(el => {
            if (enabled) {
                el.classList.add("dark-mode");
            } else {
                el.classList.remove("dark-mode");
            }
        });

        if (toggle) {
            toggle.checked = enabled;

            // Find the nearest wrapper div (Adjust selector if needed)
            const wrapperDiv = toggle.closest(".dark-mode-toggle-wrapper") || toggle.parentElement;

            if (wrapperDiv && wrapperDiv.parentElement) {
                const siblingDivs = Array.from(wrapperDiv.parentElement.children);

                // Apply or remove the "selected" class on the wrapper and its siblings
                siblingDivs.forEach(div => {
                    if (enabled) {
                        div.classList.add("selected");
                    } else {
                        div.classList.remove("selected");
                    }
                });
            }
        }
    }

    // Check localStorage for dark mode preference
    const isDarkMode = localStorage.getItem("darkMode") === "enabled";

    // Apply dark mode before the page renders to prevent flickering
    applyDarkMode(isDarkMode);

    if (toggle) {
        toggle.addEventListener("change", function () {
            if (toggle.checked) {
                localStorage.setItem("darkMode", "enabled"); // Store preference
                applyDarkMode(true);
            } else {
                localStorage.removeItem("darkMode"); // Remove stored preference
                applyDarkMode(false);
            }
        });
    }
        // END OF DARK-MODE TOGGLE------------------------------------------------------------------------            




        // POPUP ANIMATION------------------------------------------------------------------------            
				// Easing functions
const easeOutQuad = t => t * (2 - t);
const easeInQuad = t => t * t;

// Animation utility
const animate = ({ element, from, to, duration, easing, property, onComplete }) => {
  const start = performance.now();

  const tick = now => {
    let progress = (now - start) / duration;
    if (progress > 1) progress = 1;

    const eased = easing(progress);
    const current = from + (to - from) * eased;

    if (property === "opacity") {
      element.style.opacity = current;
    } else if (property === "translateY") {
      element.style.transform = `translateY(${current}rem)`;
    }

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else if (onComplete) {
      onComplete();
    }
  };

  requestAnimationFrame(tick);
};

// Main logic to attach popup behavior
window.observePopups = () => {
  document.querySelectorAll('[popup=wrapper]').forEach(wrapper => {
    if (wrapper.__popupBound) return; // prevent duplicate binding
    wrapper.__popupBound = true;

    const popup = wrapper.querySelector('[popup=content]');
    if (popup) {
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(1rem)';
    }

    wrapper.addEventListener('mouseenter', () => {
      const popup = wrapper.querySelector('[popup=content]');
      if (!popup) return;

      popup.style.display = 'flex';
      popup.style.visibility = 'visible';
      popup.style.opacity = '0';
      popup.style.transform = 'translateY(1rem)';

      animate({
        element: popup,
        from: 0,
        to: 1,
        duration: 250,
        easing: t => t,
        property: 'opacity'
      });

      animate({
        element: popup,
        from: 1,
        to: 0,
        duration: 250,
        easing: easeOutQuad,
        property: 'translateY'
      });
    });

    wrapper.addEventListener('mouseleave', () => {
      const popup = wrapper.querySelector('[popup=content]');
      if (!popup) return;

      animate({
        element: popup,
        from: 0,
        to: 1,
        duration: 250,
        easing: easeInQuad,
        property: 'translateY'
      });

      animate({
        element: popup,
        from: 1,
        to: 0,
        duration: 250,
        easing: t => t,
        property: 'opacity',
        onComplete: () => {
          popup.style.display = 'none';
          popup.style.visibility = 'hidden';
          popup.style.transform = 'translateY(0)';
        }
      });
    });
  });
};

// Run it once on initial load
window.observePopups();

// OPTIONAL: Auto-setup new elements using MutationObserver
const observer = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    if (mutation.addedNodes.length) {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) {
          if (node.matches?.('[popup=wrapper]') || node.querySelector?.('[popup=wrapper]')) {
            observePopups();
          }
        }
      });
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

        // END OF POPUP ANIMATION------------------------------------------------------------------------            




        // OVERVIEW TILES GENERATION------------------------------------------------------------------------            

    		const containers = document.querySelectorAll('[project-overview-tiles]');

    containers.forEach(container => {
      const rawInput = container.getAttribute('project-overview-tiles');
      let tilesToRender = [];

      try {
        tilesToRender = JSON.parse(rawInput);
        if (!Array.isArray(tilesToRender)) throw new Error("Input is not an array.");
      } catch (err) {
        console.error("Invalid project-overview-tiles input:", err);
        return;
      }

      const template = container.querySelector('[overview-tile="template"]');
      if (!template) return;

      container.innerHTML = "";

      tilesToRender.forEach((tile, index) => {
        const clone = template.cloneNode(true);
        clone.removeAttribute("overview-tile");
        clone.setAttribute("data-index", index);
        if (tile.id) clone.setAttribute("item-id", tile.id);

        const titleEl = clone.querySelector('[overview-tile="title"]');
        const subtitleEl = clone.querySelector('[overview-tile="subtitle"]');

        if (titleEl) titleEl.textContent = tile.title ?? "";
        if (subtitleEl) subtitleEl.textContent = tile.subtitle ?? "";

        container.appendChild(clone);
      });

      // Call layout setup once now and again on resize
      const applyLayout = () => {
        const tiles = Array.from(container.children);
        const tileCount = tiles.length;
        const isDesktop = window.innerWidth >= 1280;

        // Reset any styles first
        container.style.display = "";
        container.style.flexDirection = "";
        container.style.gridTemplateColumns = "";
        container.style.gridTemplateRows = "";
        tiles.forEach(tile => tile.style.gridColumn = "");

        if (!isDesktop) {
          // Mobile & tablet — stack vertically
          container.style.display = "flex";
          container.style.flexDirection = "column";
          return;
        }

        // Desktop logic
        if (tileCount === 1) {
          container.style.display = "flex";
        } else {
          container.style.display = "grid";
          container.style.gridTemplateColumns = "1fr 1fr";

          // You can let Webflow handle row gaps etc.
          // Optionally: container.style.gridAutoRows = "auto";

          // Special full-width bottom tiles for odd tile counts (3, 5, 7, etc.)
          if (tileCount % 2 === 1) {
            const lastTile = tiles[tileCount - 1];
            if (lastTile) lastTile.style.gridColumn = "span 2";
          }
        }
      };

      // Run once after rendering
      applyLayout();

      // Run on window resize with debounce
      let resizeTimeout;
      window.addEventListener("resize", () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          applyLayout();
        }, 100);
      });
    });
        // END OF OVERVIEW TILES GENERATION------------------------------------------------------------------------            











});
// END OF DOM EVENT LISTENER------------------------------------------------------------





 
 
 
// CHECKBOX "SELECTED" STATUS CHANGE AND GROUP BEHAVIOR------------------------------------
(function() {
       function domReady(callback) {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                callback();
            } else {
                document.addEventListener('DOMContentLoaded', callback);
            }
        }

        domReady(function() {
            const inputProto = HTMLInputElement.prototype;
            const descriptor = Object.getOwnPropertyDescriptor(inputProto, 'checked');
            Object.defineProperty(inputProto, 'checked', {
                get: function() {
                    return descriptor.get.call(this);
                },
                set: function(value) {
                    const oldValue = this.checked;
                    descriptor.set.call(this, value);
                    if (oldValue !== value) {
                        this.dispatchEvent(new CustomEvent('checkedChange', {
                            bubbles: true,
                            detail: { oldValue, newValue: value }
                        }));
                    }
                }
            });

            function toggleSelectedClass(element, shouldAdd) {
                if (!element.classList.contains('text')) {
                    if (shouldAdd) {
                        element.classList.add('selected');
                    } else {
                        element.classList.remove('selected');
                    }
                }
                Array.from(element.children).forEach(child => {
                    if (child.tagName.toLowerCase() === 'div') {
                        toggleSelectedClass(child, shouldAdd);
                    }
                });
            }

            function updateCheckboxClasses(checkbox) {
                const container = checkbox.closest('.checkbox');
                if (container) {
                    toggleSelectedClass(container, checkbox.checked);
                }
            }

            function updateGroupStyles(groupVal) {
                const groupCheckboxes = Array.from(document.querySelectorAll(`input[type="checkbox"][grouping="${groupVal}"]`));
                if (groupCheckboxes.every(cb => !cb.checked)) {
                    groupCheckboxes.forEach(cb => {
                        const container = cb.closest('.checkbox');
                        if (container) {
                            toggleSelectedClass(container, true);
                        }
                    });
                } else {
                    groupCheckboxes.forEach(cb => updateCheckboxClasses(cb));
                }
            }

            function onCheckboxChange(e) {
                const checkbox = e.target;
                if (checkbox.hasAttribute('grouping')) {
                    const groupVal = checkbox.getAttribute('grouping');
                    updateGroupStyles(groupVal);
                } else {
                    updateCheckboxClasses(checkbox);
                }
            }

            document.addEventListener('change', function(e) {
                if (e.target.matches('input[type="checkbox"]')) {
                    onCheckboxChange(e);
                }
            });
            document.addEventListener('checkedChange', function(e) {
                if (e.target.matches('input[type="checkbox"]')) {
                    onCheckboxChange(e);
                }
            });
        });
    })();
// END OF CHECKBOX "SELECTED" STATUS CHANGE AND GROUP BEHAVIOR------------------------------------------


// PERCENTAGE TRACK FUNCTION------------------------------------------

function initializePercentageTracks(scope = document) {
  scope.querySelectorAll("[percentage-track]").forEach(track => {
    try {
      if (track.__initialized) return; // prevent double init
      track.__initialized = true;

      let schematic = track.getAttribute("percentage-track");
      let classPrefix = track.getAttribute("class-prefix") || "";
      let additionalClasses = track.getAttribute("additional-class");
      let additionalClassList = additionalClasses ? additionalClasses.split(" ") : [];

      let pattern = /\[(\d+),\s*([^\]]+)\]/g;
      let match;

      while ((match = pattern.exec(schematic)) !== null) {
        let count = parseInt(match[1], 10);
        let styleClass = match[2].trim();

        if (classPrefix) {
          styleClass = `${classPrefix}${styleClass}`;
        }

        for (let i = 0; i < count; i++) {
          let bar = document.createElement("div");
          bar.classList.add("percentage-track-bar", styleClass);
          additionalClassList.forEach(cls => bar.classList.add(cls));
          bar.setAttribute("dark-mode", "true");

          if (i === 0) bar.classList.add("first");
          if (i === count - 1) bar.classList.add("last");

          track.appendChild(bar);
        }
      }
    } catch (error) {
      console.warn("Skipping a percentage-track due to an error:", error);
    }
  });
}
// END OF PERCENTAGE TRACK FUNCTION------------------------------------------


// DONUT PERCENTAGE GENERATOR -----------------------------------------------
function initializePercentageDonuts(scope = document) {
  scope.querySelectorAll("[percentage-donut]").forEach(donut => {
    if (donut.__initialized) return;
    donut.__initialized = true;

    const schematic = donut.getAttribute("percentage-donut");
    const classPrefix = donut.getAttribute("class-prefix") || "";
    const additionalClasses = donut.getAttribute("additional-class");
    const additionalClassList = additionalClasses ? additionalClasses.split(" ") : [];

    const pattern = /\[(\d+),\s*([^\]]+)\]/g;
    const rawSegments = [];
    let match;

    while ((match = pattern.exec(schematic)) !== null) {
      const count = parseInt(match[1], 10);
      if (count <= 0) continue;
      let styleClass = match[2].trim();
      if (classPrefix) styleClass = `${classPrefix}${styleClass}`;
      rawSegments.push({ styleClass, count });
    }

    if (rawSegments.length === 0) return;

    const segmentMap = new Map();
    rawSegments.forEach(({ styleClass, count }) => {
      segmentMap.set(styleClass, (segmentMap.get(styleClass) || 0) + count);
    });

    const segments = Array.from(segmentMap.entries())
      .map(([styleClass, count]) => ({ styleClass, count }))
      .filter(seg => seg.count > 0);

    const totalUnits = segments.reduce((sum, seg) => sum + seg.count, 0);

    const size = donut.offsetWidth;
    const strokeWidth = size * 0.18;
    const outerRadius = size / 2;
    const innerRadius = outerRadius - strokeWidth;
    const center = size / 2;
    const gapPx = 1;

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", size);
    svg.setAttribute("height", size);
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.style.display = "block";
    svg.style.overflow = "visible";

    let currentAngle = -90;

    segments.forEach(({ styleClass, count }) => {
      const percent = count / totalUnits;
      const segmentAngle = 360 * percent;
      const start = currentAngle;
      const end = start + segmentAngle;
      currentAngle = end;

      const fillDiv = document.createElement("div");
      fillDiv.className = styleClass;
      document.body.appendChild(fillDiv);
      const fillColor = getComputedStyle(fillDiv).backgroundColor || "#999";
      fillDiv.remove();

      let strokeColor = fillColor;
      if (styleClass.endsWith("-10")) {
        const strokeClass = styleClass.replace(/-10$/, "-5");
        const strokeDiv = document.createElement("div");
        strokeDiv.className = strokeClass;
        document.body.appendChild(strokeDiv);
        strokeColor = getComputedStyle(strokeDiv).backgroundColor || fillColor;
        strokeDiv.remove();
      }

      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("d", generateWedgePath(center, center, outerRadius, innerRadius, start, end, gapPx));
      path.setAttribute("fill", fillColor);
      path.setAttribute("stroke", strokeColor);
      path.setAttribute("stroke-width", 1);
      path.setAttribute("stroke-linejoin", "round");
      svg.appendChild(path);
    });

    // Center hole
    const hole = document.createElementNS(svgNS, "circle");
    hole.setAttribute("cx", center);
    hole.setAttribute("cy", center);
    hole.setAttribute("r", innerRadius * 0.2);
    hole.setAttribute("fill", getComputedStyle(donut).backgroundColor || "#fff");
    svg.appendChild(hole);

    donut.innerHTML = "";
    donut.appendChild(svg);
  });

  function polarToCartesian(cx, cy, r, angleDegrees) {
    const angleRadians = angleDegrees * (Math.PI / 180);
    return {
      x: cx + r * Math.cos(angleRadians),
      y: cy + r * Math.sin(angleRadians),
    };
  }

  function offsetPerpendicular(x, y, cx, cy, amount) {
    const dx = x - cx, dy = y - cy;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { x, y };
    const nx = -dy / length, ny = dx / length;
    return {
      x: x + nx * amount,
      y: y + ny * amount
    };
  }

  function generateWedgePath(cx, cy, outerR, innerR, startDeg, endDeg, gapPx) {
    const gap = gapPx / 2;
    const start = polarToCartesian(cx, cy, outerR, startDeg);
    const end = polarToCartesian(cx, cy, outerR, endDeg);
    const startIn = polarToCartesian(cx, cy, innerR, startDeg);
    const endIn = polarToCartesian(cx, cy, innerR, endDeg);

    const p1 = offsetPerpendicular(start.x, start.y, cx, cy, gap);
    const p2 = offsetPerpendicular(end.x, end.y, cx, cy, -gap);
    const p3 = offsetPerpendicular(endIn.x, endIn.y, cx, cy, -gap);
    const p4 = offsetPerpendicular(startIn.x, startIn.y, cx, cy, gap);

    const largeArc = ((endDeg - startDeg + 360) % 360) > 180 ? 1 : 0;

    return `
      M ${p1.x} ${p1.y}
      A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}
      L ${p3.x} ${p3.y}
      A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}
      Z
    `.trim();
  }
}

initializePercentageDonuts();


// END OF DONUT PERCENTAGE GENERATOR -----------------------------------------
















document.addEventListener("DOMContentLoaded", () => {
  const scrollOffset = window.innerHeight * 0.4;
  const scrollContainer = document.getElementById("page");
  const hasScrollContainer = !!scrollContainer;
  if (!hasScrollContainer) {
    console.warn("No #page scroll container found. Scroll sync and content-tree scroll behavior will be skipped.");
  }

  const fadeDuration = 300;
  const urlParams = new URLSearchParams(window.location.search);
  const selectedId = urlParams.get("selection");

  const usedIdMap = {};
  const dropdownLinks = [];

  // ================================
  // 1. CONTENT-TREE RENDERING
  // ================================

  const sourceContainer = document.querySelector("[content-tree-items='true']");
  if (!sourceContainer) return;

  const sourceMap = {};
  sourceContainer.querySelectorAll("[id]").forEach(el => {
    sourceMap[el.id] = el;
  });

  document.querySelectorAll("[content-tree]").forEach(container => {
    const groupId = container.getAttribute("content-tree-group") || "default";

    let treeData;
    try {
      treeData = JSON.parse(container.getAttribute("content-tree"));
    } catch (e) {
      console.warn("Invalid content-tree JSON");
      return;
    }

    const fragment = document.createDocumentFragment();
    const topLevelIds = [];

    treeData.order.forEach(entry => {
      const builtItems = buildNested(entry, sourceMap, usedIdMap);
      builtItems.forEach(built => {
        if (!built.id) return;
        built.style.opacity = "0";
        built.style.transition = `opacity ${fadeDuration}ms ease`;
        built.style.display = "none";
        built.classList.add("content-tree-item");
        topLevelIds.push(built.id);
        fragment.appendChild(built);
      });
    });


    container.innerHTML = "";
    container.appendChild(fragment);
    initializePercentageTracks(container);
    container.__topLevelIds = topLevelIds;

    const grouped = container.hasAttribute("content-tree-group") && hasGroupTabs(groupId);

    // ================================
    // 1A. SELECTION / INITIAL DISPLAY
    // ================================

    if (grouped) {
      let activeId = topLevelIds[0];
      let scrollTargetId = null;

      if (selectedId) {
        const selectedEl = container.querySelector("#" + selectedId);
        const topLevelEl = selectedEl?.closest(".content-tree-item");
        if (selectedEl && topLevelEl) {
          activeId = topLevelEl.id;
          scrollTargetId = selectedId;
        }
      }

      showItem(container, activeId, groupId);

      if (hasScrollContainer && scrollTargetId && scrollTargetId !== activeId) {
        const targetEl = container.querySelector("#" + scrollTargetId);
        if (targetEl) {
          requestAnimationFrame(() => {
            const containerTop = scrollContainer.getBoundingClientRect().top;
            const itemTop = targetEl.getBoundingClientRect().top;
            const offset = itemTop - containerTop - scrollOffset;
            scrollContainer.scrollTo({ top: scrollContainer.scrollTop + offset, behavior: "smooth" });
          });
        }
      }
    } else {
      // Show ALL top-level items
      topLevelIds.forEach(id => {
        const el = container.querySelector("#" + id);
        if (el) {
          el.style.display = "";
          requestAnimationFrame(() => { el.style.opacity = "1"; });
          el.classList.add("cm-visible");
        }
      });
    }

    // ================================
    // 1B. TAB NAVIGATION LOGIC
    // ================================

    document.querySelectorAll(`[content-tree-tab][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.addEventListener("click", () => {
        const visible = container.querySelector(".cm-visible");
        const currentId = visible?.id || topLevelIds[0];
        const currentIndex = topLevelIds.indexOf(currentId);
        if (currentIndex === -1) return;

        const dir = btn.getAttribute("content-tree-tab") === "next" ? 1 : -1;
        const nextIndex = currentIndex + dir;
        if (nextIndex < 0 || nextIndex >= topLevelIds.length) return;

        const nextId = topLevelIds[nextIndex];
        hideItem(container.querySelector("#" + currentId), () => {
          showItem(container, nextId, groupId);
          updateURLSelection(nextId);
          setTimeout(() => syncDropdownHighlightNow(), 50);
        });
      });
    });
  });

  sourceContainer.remove();

  // ================================
  // 1C. BUILD NESTED STRUCTURE RECURSIVELY
  // ================================

 function buildNested(entry, sourceMap, usedMap, depth = 0) {
  const indent = "  ".repeat(depth); // For visual hierarchy in logs

  if (!entry || typeof entry !== "object" || !entry.id) {
    console.warn(indent + "⚠️ Invalid entry:", entry);
    return [];
  }

  const baseId = entry.id;
  const usedList = usedMap[baseId] || [];
  const instanceCount = usedList.length;
  const newId = instanceCount === 0 ? baseId : `${baseId}-${instanceCount + 1}`;

  const children = Array.isArray(entry.children) ? entry.children : [];

  // Debug: Log entry at current level
  console.log(`${indent}🔍 Processing ${baseId} → ${newId}`);
  if (!sourceMap[baseId]) {
    console.warn(`${indent}⛔ Missing from sourceMap: ${baseId} → Promoting children`);
    return children.flatMap(child => buildNested(child, sourceMap, usedMap, depth + 1));
  }

  const clone = sourceMap[baseId].cloneNode(true);
  clone.id = newId;

  if (!usedMap[baseId]) usedMap[baseId] = [];
  usedMap[baseId].push(newId);

  const nestedChildren = children.flatMap(child => buildNested(child, sourceMap, usedMap, depth + 1));

  const target = clone.querySelector("[nesting-target='true']");
  if (target) {
    console.log(`${indent}📦 Appending ${nestedChildren.length} children into [nesting-target] of ${newId}`);
    nestedChildren.forEach(el => {
      if (el instanceof Element) {
        target.appendChild(el);
      } else {
        console.warn(indent + "⚠️ Skipped invalid child:", el);
      }
    });
    return [clone];
  }

  if (nestedChildren.length > 0) {
    console.warn(`${indent}⚠️ No nesting-target in ${baseId} — promoting children alongside it`);
    return [clone, ...nestedChildren];
  }

  console.log(`${indent}✅ Leaf node: ${newId}`);
  return [clone];
}




  function showItem(container, id, groupId) {
    const el = container.querySelector("#" + id);
    if (!el) return;

    el.style.display = "";
    requestAnimationFrame(() => { el.style.opacity = "1"; });
    el.classList.add("cm-visible");

    const topIds = container.__topLevelIds || [];
    const currentIndex = topIds.indexOf(id);

    document.querySelectorAll(`[content-tree-tab="previous"][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.style.display = currentIndex <= 0 ? "none" : "";
    });
    document.querySelectorAll(`[content-tree-tab="next"][content-tree-group="${groupId}"]`).forEach(btn => {
      btn.style.display = currentIndex >= topIds.length - 1 ? "none" : "";
    });
  }

  function hideItem(el, callback) {
    if (!el) return;
    el.style.opacity = "0";
    setTimeout(() => {
      el.style.display = "none";
      el.classList.remove("cm-visible");
      if (callback) callback();
    }, fadeDuration);
  }

  function updateURLSelection(id) {
    const params = new URLSearchParams(window.location.search);
    params.set("selection", id);
    const newURL = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, "", newURL);
  }

  function hasGroupTabs(groupId) {
    return document.querySelectorAll(`[content-tree-tab][content-tree-group="${groupId}"]`).length > 0;
  }

  // If no content-tree was used, fallback to populating usedIdMap from dropdown-tree
  if (Object.keys(usedIdMap).length === 0) {
    document.querySelectorAll("[dropdown-tree]").forEach(container => {
      let tree;
      try {
        tree = JSON.parse(container.getAttribute("dropdown-tree"));
      } catch (e) {
        return;
      }
      const countMap = {};
      function countIds(entry) {
        if (!entry?.id) return;
        countMap[entry.id] = (countMap[entry.id] || 0) + 1;
        if (Array.isArray(entry.children)) {
          entry.children.forEach(child => countIds(child));
        }
      }
      tree.order.forEach(entry => countIds(entry));
      for (const [id, count] of Object.entries(countMap)) {
        usedIdMap[id] = [];
        for (let i = 0; i < count; i++) {
          usedIdMap[id].push(i === 0 ? id : `${id}-${i + 1}`);
        }
      }
    });
  }

  window.contentTreeIdMap = usedIdMap;

  // ================================
  // 2. DROPDOWN-TREE GENERATION
  // ================================

  document.querySelectorAll("[dropdown-tree]").forEach(container => {
    let tree;
    try {
      tree = JSON.parse(container.getAttribute("dropdown-tree"));
    } catch (e) {
      console.warn("Invalid dropdown-tree JSON");
      return;
    }

    const itemTemplate = container.querySelector("[dropdown-item='true']");
    const groupTemplate = container.querySelector("[dropdown-group='true']");
    if (!itemTemplate || !groupTemplate) return;

    const renderedItems = [];
    const instanceTracker = {};

    tree.order.forEach(entry => {
      const built = buildDropdownEntry(entry, itemTemplate, groupTemplate, usedIdMap, instanceTracker);
      if (built) renderedItems.push(...(Array.isArray(built) ? built : [built]));
    });

    renderedItems.flat().forEach(el => {
      if (el instanceof Element) {
        itemTemplate.parentElement.appendChild(el);
      } else {
        console.warn("Skipped non-element in rendered dropdown items:", el);
      }
    });

    itemTemplate.remove();
    groupTemplate.remove();
  });

  function buildDropdownEntry(entry, itemTemplate, groupTemplate, idMap, instanceTracker) {
    if (!entry?.id) return null;

    const baseId = entry.id;
    const usedIds = idMap[baseId] || [baseId];
    const index = instanceTracker[baseId] || 0;
    const actualId = usedIds[index] || baseId;
    instanceTracker[baseId] = index + 1;

    const baseLink = entry.link?.split("?")[0] || "#";
    const href = `${baseLink}?selection=${actualId}`;
    const dropdownFlag = entry.dropdown !== false;
    const hasChildren = Array.isArray(entry.children) && entry.children.length > 0;

    const visibleChildren = hasChildren
      ? entry.children.map(child => buildDropdownEntry(child, itemTemplate, groupTemplate, idMap, instanceTracker)).filter(Boolean)
      : [];

    if (!dropdownFlag && visibleChildren.length > 0) {
      return visibleChildren;
    }

    if (dropdownFlag && visibleChildren.length > 0) {
      const groupClone = groupTemplate.cloneNode(true);
      const titleEl = groupClone.querySelector("[dropdown-item-title='true']");
      if (titleEl) titleEl.textContent = entry.title;
      const menuTarget = groupClone.querySelector("[dropdown-menu='true']");
      if (menuTarget) visibleChildren.forEach(child => menuTarget.appendChild(child));
      return groupClone;
    }

    if (dropdownFlag && visibleChildren.length === 0) {
      return buildDropdownItem(entry, itemTemplate, href, actualId);
    }

    return null;
  }

  function buildDropdownItem(entry, template, href, actualId) {
    const clone = template.cloneNode(true);
    const title = clone.querySelector("[dropdown-item-title='true']");
    const link = clone.querySelector("[dropdown-item-link='true']");
    const target = clone.querySelector("[dropdown-item-target]");

    if (title) title.textContent = entry.title;
    if (link) link.setAttribute("href", href);
    if (target) {
      target.setAttribute("dropdown-item-target", actualId);
      dropdownLinks.push(target);
    }

    return clone;
  }

  // ================================
  // 3. SCROLL-BASED .SELECTED SYNC
  // ================================

  let ticking = false;

  function isVisible(el) {
    return el.offsetParent !== null;
  }

  function findNearestVisibleId() {
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const containerBottom = scrollContainer.getBoundingClientRect().bottom;

    const visibleSections = Array.from(document.querySelectorAll("[content-tree] .content-tree-item")).filter(isVisible);
    const validTargetIds = new Set(
      Array.from(document.querySelectorAll("[dropdown-item-target]")).map(link => link.getAttribute("dropdown-item-target"))
    );

    const visibleContentItems = visibleSections.flatMap(section => {
      const list = [section];
      const nested = Array.from(section.querySelectorAll("[id]"));
      return list.concat(nested);
    }).filter(el => validTargetIds.has(el.id));

    let closestId = null;
    let closestDistance = Infinity;

    visibleContentItems.forEach(el => {
      if (!el.id) return;
      const rect = el.getBoundingClientRect();
      const elTop = rect.top;
      const elBottom = rect.bottom;

      const isInView = elBottom >= containerTop + scrollOffset * 0.25 &&
                       elTop <= containerBottom - scrollOffset * 0.25;

      if (isInView) {
        const distanceToCenter = Math.abs(rect.top - (containerTop + scrollOffset));
        if (distanceToCenter < closestDistance) {
          closestId = el.id;
          closestDistance = distanceToCenter;
        }
      }
    });

    return closestId;
  }

  function updateSelectedDropdown(activeId) {
    dropdownLinks.forEach(link => {
      const targetId = link.getAttribute("dropdown-item-target");
      if (targetId === activeId) {
        link.classList.add("selected");
      } else {
        link.classList.remove("selected");
      }
    });
  }

  function syncDropdownHighlightNow() {
    const activeId = findNearestVisibleId();
    updateSelectedDropdown(activeId);
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      syncDropdownHighlightNow();
      ticking = false;
    });
  }

  if (hasScrollContainer) {
    scrollContainer.addEventListener("scroll", onScroll);
    requestAnimationFrame(() => syncDropdownHighlightNow());
  }

  window.syncDropdownHighlightNow = syncDropdownHighlightNow;
});
