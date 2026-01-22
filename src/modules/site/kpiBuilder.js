import { onDocumentReady } from "../utils/dom.js";
import { withBasePath } from "../utils/paths.js";

export function initKpiBuilder() {
  // Boot the KPI builder once the DOM is ready.
  onDocumentReady(() => {
    // Column definitions per role.
    const roleCols = {
      Farm: [
        "Produce",
        "Category",
        "Farm Cost $/lb",
        "Farm Markup %",
        "Farm Sale $/lb",
        "Farm Shrink %",
        "Farm GP $/lb",
        "Farm GM %",
        "Qty lbs",
      ],
      Distributor: [
        "Produce",
        "Category",
        "Farm Sale $/lb",
        "Dist Handling $/lb",
        "Dist Margin %",
        "Dist Sale $/lb",
        "Dist Shrink %",
        "Dist GP $/lb",
        "Dist GM %",
        "Qty lbs",
      ],
      Bodega: [
        "Produce",
        "Category",
        "Dist. Sale $/lb",
        "Retail Handling $/lb",
        "Retail Margin %",
        "Retail Price $/lb",
        "Bodega Shrink %",
        "Bodega GP $/lb",
        "Bodega GM %",
        "Qty lbs",
      ],
    };

    // KPI columns that are always computed.
    const kpiDefs = [
      "Farm GP $/lb",
      "Farm GM %",
      "Dist. GP $/lb",
      "Dist. GM %",
      "Bodega GP $/lb",
      "Bodega GM %",
    ];

    // Table state.
    let hot;
    let hotData = [];
    let colHeaders = [];
    let currentRole = null; // "Farm" | "Distributor" | "Bodega"
    const userVisible = new Set();
    const userHidden = new Set();
    const selectedCrops = new Set();

    // Simple rounding helper.
    const round = (value, digits = 2) =>
      isFinite(value) ? +(+value).toFixed(digits) : 0;

    // Recalculate a single row from the formulas.
    function recalcRow(rowIndex) {
      const row = hot.getSourceDataAtRow(rowIndex);

      // Force numeric values where possible.
      Object.keys(row).forEach((key) => {
        if (row[key] === "") row[key] = 0;
        row[key] = Number(row[key]) || row[key];
      });

      row["Farm Sale $/lb"] =
        row["Farm Cost $/lb"] * (1 + row["Farm Markup %"] / 100);
      row["Dist Sale $/lb"] =
        (row["Farm Sale $/lb"] + row["Dist Handling $/lb"]) *
        (1 + row["Dist Margin %"] / 100);
      row["Retail Price $/lb"] =
        (row["Dist Sale $/lb"] + row["Retail Handling $/lb"]) *
        (1 + row["Retail Margin %"] / 100);

      row["Farm GP $/lb"] = row["Farm Sale $/lb"] - row["Farm Cost $/lb"];
      row["Farm GM %"] = row["Farm Sale $/lb"]
        ? (100 * row["Farm GP $/lb"]) / row["Farm Sale $/lb"]
        : 0;
      row["Dist GP $/lb"] =
        row["Dist Sale $/lb"] -
        row["Farm Sale $/lb"] -
        row["Dist Handling $/lb"];
      row["Dist GM %"] = row["Dist Sale $/lb"]
        ? (100 * row["Dist GP $/lb"]) / row["Dist Sale $/lb"]
        : 0;
      row["Bodega GP $/lb"] =
        row["Retail Price $/lb"] * (1 - row["Bodega Shrink %"] / 100) -
        row["Dist Sale $/lb"] -
        row["Retail Handling $/lb"];
      row["Bodega GM %"] = row["Retail Price $/lb"]
        ? (100 * row["Bodega GP $/lb"]) / row["Retail Price $/lb"]
        : 0;
    }

    // Compute row values without depending on Handsontable.
    function computeRowObj(row) {
      // Force numeric values where possible.
      Object.keys(row).forEach((key) => {
        if (row[key] === "") row[key] = 0;
        row[key] = Number(row[key]) || row[key];
      });

      row["Farm Sale $/lb"] =
        row["Farm Cost $/lb"] * (1 + row["Farm Markup %"] / 100);
      row["Dist Sale $/lb"] =
        (row["Farm Sale $/lb"] + row["Dist Handling $/lb"]) *
        (1 + row["Dist Margin %"] / 100);
      row["Retail Price $/lb"] =
        (row["Dist Sale $/lb"] + row["Retail Handling $/lb"]) *
        (1 + row["Retail Margin %"] / 100);

      row["Farm GP $/lb"] = row["Farm Sale $/lb"] - row["Farm Cost $/lb"];
      row["Farm GM %"] = row["Farm Sale $/lb"]
        ? (100 * row["Farm GP $/lb"]) / row["Farm Sale $/lb"]
        : 0;
      row["Dist GP $/lb"] =
        row["Dist Sale $/lb"] -
        row["Farm Sale $/lb"] -
        row["Dist Handling $/lb"];
      row["Dist GM %"] = row["Dist Sale $/lb"]
        ? (100 * row["Dist GP $/lb"]) / row["Dist Sale $/lb"]
        : 0;
      row["Bodega GP $/lb"] =
        row["Retail Price $/lb"] * (1 - row["Bodega Shrink %"] / 100) -
        row["Dist Sale $/lb"] -
        row["Retail Handling $/lb"];
      row["Bodega GM %"] = row["Retail Price $/lb"]
        ? (100 * row["Bodega GP $/lb"]) / row["Retail Price $/lb"]
        : 0;
    }

    // Sum totals for the selected role.
    function recalcTotals(role) {
      console.log("TOT-DEBUG", role);
      if (role === "Distributor") {
        console.table(hot.getSourceData().slice(0, 3), [
          "Produce",
          "Dist. Sale $/lb",
          "Dist. GP $/lb",
          "Qty lbs",
        ]);
      }

      const data = hot.getSourceData();
      let rev = 0;
      let gp = 0;
      let qty = 0;

      data.forEach((row) => {
        // Respect the crop filter.
        if (!selectedCrops.has(row["Produce"])) return;
        const q = Number(row["Qty lbs"]) || 0;
        if (!q) return;
        qty += q;

        const num = (value) => Number(value) || 0;
        if (role === "Farm") {
          rev += num(row["Farm Sale $/lb"]) * q;
          gp += num(row["Farm GP $/lb"]) * q;
        } else if (role === "Distributor") {
          rev += num(row["Dist Sale $/lb"]) * q;
          gp += num(row["Dist GP $/lb"]) * q;
        } else if (role === "Bodega") {
          rev +=
            num(row["Retail Price $/lb"]) *
            (1 - num(row["Bodega Shrink %"]) / 100) *
            q;
          gp += num(row["Bodega GP $/lb"]) * q;
        }
      });

      const gm = rev ? (100 * gp) / rev : 0;
      const html = `<ul class="list-unstyled mb-0">
           <li><strong>Total Qty (lbs):</strong> ${round(qty, 0)}</li>
           <li><strong>Total Revenue ($):</strong> ${round(rev, 2)}</li>
           <li><strong>Total GP ($):</strong> ${round(gp, 2)}</li>
           <li><strong>Gross Margin %:</strong> ${round(gm, 1)}</li>
         </ul>`;
      document.getElementById("totalsContent").innerHTML = html;
    }

    // Apply column visibility rules based on role + user toggles.
    function applyVisibility() {
      const hiddenIdx = [];
      colHeaders.forEach((header, index) => {
        if (header === "Produce" || header === "Category") {
          return;
        }
        let visible = false;
        if (userVisible.has(header)) visible = true;
        else if (userHidden.has(header)) visible = false;
        else if (currentRole && roleCols[currentRole].includes(header))
          visible = true;
        else visible = false;
        if (!visible) hiddenIdx.push(index);
      });

      const plugin = hot.getPlugin("hiddenColumns");
      // Reset visibility before applying hidden columns.
      plugin.showColumns(colHeaders.map((_, index) => index));
      if (hiddenIdx.length) plugin.hideColumns(hiddenIdx);
      hot.render();
    }

    // Switch the active role and refresh totals.
    function setRole(role) {
      currentRole = role;
      document.getElementById("totalsCard").classList.remove("d-none");
      applyVisibility();
      // Recompute every row so derived values stay in sync.
      hot.getSourceData().forEach((_, idx) => recalcRow(idx));
      recalcTotals(role);
    }

    // Build column definitions for Handsontable.
    function buildColumnDefs() {
      return colHeaders.map((header) => {
        const readOnly =
          header === "Produce" ||
          header === "Category" ||
          kpiDefs.includes(header);
        const isPercent = header.includes("%");
        const isNumeric =
          header.includes("$") ||
          isPercent ||
          header === "Qty lbs" ||
          kpiDefs.includes(header);

        return {
          data: header,
          readOnly,
          type: isNumeric ? "numeric" : "text",
          numericFormat: isNumeric
            ? { pattern: isPercent ? "0.0" : "0.00" }
            : undefined,
        };
      });
    }

    // Build the column visibility toggles.
    function buildColumnToggles() {
      const container = document.getElementById("columnToggles");
      container.innerHTML = "";
      colHeaders.forEach((header, index) => {
        const id = "chk_" + index;
        const isDisabled = header === "Produce" || header === "Category";
        container.insertAdjacentHTML(
          "beforeend",
          `<div class="toggle-item">
            <label class="toggle-switch">
              <input type="checkbox" ${isDisabled ? "checked disabled" : ""} checked id="${id}">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label ${isDisabled ? "disabled" : ""}">${header}</span>
          </div>`,
        );
        container.lastElementChild
          .querySelector("input")
          .addEventListener("change", (event) => {
            if (event.target.disabled) return;
            if (event.target.checked) {
              userVisible.add(header);
              userHidden.delete(header);
            } else {
              userHidden.add(header);
              userVisible.delete(header);
            }
            applyVisibility();
          });
      });
    }

    // Allow dragging the offcanvas panel by its header.
    function enableDrag(panel, handle) {
      let sx;
      let sy;
      let ox;
      let oy;
      let drag = false;

      handle.addEventListener("mousedown", (event) => {
        drag = true;
        panel.classList.add("draggable");
        sx = event.clientX;
        sy = event.clientY;
        const rect = panel.getBoundingClientRect();
        ox = rect.left;
        oy = rect.top;
        document.addEventListener("mousemove", mv);
        document.addEventListener("mouseup", up);
      });

      function mv(event) {
        if (!drag) return;
        panel.style.transform = "none";
        panel.style.left = ox + event.clientX - sx + "px";
        panel.style.top = oy + event.clientY - sy + "px";
      }

      function up() {
        drag = false;
        panel.classList.remove("draggable");
        document.removeEventListener("mousemove", mv);
        document.removeEventListener("mouseup", up);
      }
    }

    // Toggle accordion sections with a simple click handler.
    document.addEventListener("click", (event) => {
      if (event.target.classList.contains("accordion-button")) {
        const button = event.target;
        const content = button.parentElement.nextElementSibling;
        button.classList.toggle("collapsed");
        content.classList.toggle("show");
      }
    });

    // Offcanvas show/hide state.
    const offcanvas = document.getElementById("columnOptions");
    const backdrop = document.getElementById("offcanvasBackdrop");

    console.log("Offcanvas element:", offcanvas);
    console.log("Backdrop element:", backdrop);

    function openOffcanvas() {
      offcanvas.classList.add("show");
      backdrop.classList.add("show");
      document.body.classList.add("offcanvas-open");
      console.log("Offcanvas opened:", offcanvas.classList.contains("show"));
      console.log("Offcanvas content:", offcanvas.innerHTML);
      console.log(
        "Column toggles:",
        document.getElementById("columnToggles").innerHTML,
      );
      console.log(
        "Crop toggles:",
        document.getElementById("cropToggles").innerHTML,
      );
    }

    function closeOffcanvas() {
      offcanvas.classList.remove("show");
      backdrop.classList.remove("show");
      document.body.classList.remove("offcanvas-open");
    }

    // Connect the gear button to the panel.
    const gearBtn = document.getElementById("gearBtn");
    if (gearBtn) {
      gearBtn.onclick = openOffcanvas;
      console.log("Gear button found and configured");
    } else {
      console.error("Gear button not found!");
    }
    document.getElementById("closeCanvas").onclick = closeOffcanvas;
    backdrop.onclick = closeOffcanvas;

    // Close when the escape key is pressed.
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && offcanvas.classList.contains("show")) {
        closeOffcanvas();
      }
    });

    enableDrag(offcanvas, offcanvas.querySelector(".offcanvas-header"));

    // Load CSV data and initialize Handsontable.
    Papa.parse(withBasePath("data/Supply_Chain_KPI_Builder.csv"), {
      download: true,
      header: true,
      dynamicTyping: true,
      complete: (res) => {
        hotData = res.data.filter((row) => row.Produce);

        // Normalize distributor keys to avoid nested path issues.
        hotData.forEach((row) => {
          if ("Dist. Sale $/lb" in row) {
            row["Dist Sale $/lb"] = row["Dist. Sale $/lb"];
            delete row["Dist. Sale $/lb"];
          }
          if ("Dist. Margin %" in row) {
            row["Dist Margin %"] = row["Dist. Margin %"];
            delete row["Dist. Margin %"];
          }
          if ("Dist. Handling $/lb" in row) {
            row["Dist Handling $/lb"] = row["Dist. Handling $/lb"];
            delete row["Dist. Handling $/lb"];
          }
          if ("Dist. Shrink %" in row) {
            row["Dist Shrink %"] = row["Dist. Shrink %"];
            delete row["Dist. Shrink %"];
          }
        });

        // Pre-compute derived values before creating the table.
        hotData.forEach(computeRowObj);
        colHeaders = Object.keys(hotData[0]);

        const container = document.getElementById("hot");
        hot = new Handsontable(container, {
          data: hotData,
          colHeaders,
          columns: buildColumnDefs(),
          licenseKey: "non-commercial-and-evaluation",
          stretchH: "all",
          height: "100%",
          rowHeaders: true,
          colWidths: 120,
          rowHeights: 35,
          hiddenColumns: { columns: [], indicators: true },
          hiddenRows: { rows: [], indicators: true },
          afterChange: (changes, src) => {
            if (src === "loadData" || !changes) return;
            new Set(changes.map((change) => change[0])).forEach((rowIdx) =>
              recalcRow(rowIdx),
            );
            hot.render();
            const roleSel = document.querySelector(
              'input[name="role"]:checked',
            );
            if (roleSel) recalcTotals(roleSel.value);
          },
        });

        // Initialize crop filters and UI.
        hotData.forEach((row) => selectedCrops.add(row["Produce"]));
        buildCropToggles();
        buildColumnToggles();
        applyRowFilter();

        // Debug output for panel readiness.
        console.log("Content loaded, gear button should work now");
        console.log(
          "Column toggles built:",
          document.getElementById("columnToggles").children.length,
        );
        console.log(
          "Crop toggles built:",
          document.getElementById("cropToggles").children.length,
        );
      },
    });

    // Role toggle listeners.
    document.querySelectorAll(".role-toggle").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        document
          .querySelectorAll(".role-toggle")
          .forEach((button) => button.classList.remove("active"));
        event.target.classList.add("active");
        setRole(event.target.dataset.role);
      });
    });

    // Apply the crop filter to the table rows.
    function applyRowFilter() {
      const hidden = [];
      hotData.forEach((row, idx) => {
        if (!selectedCrops.has(row["Produce"])) hidden.push(idx);
      });
      const plugin = hot.getPlugin("hiddenRows");
      plugin.showRows([...Array(hotData.length).keys()]);
      if (hidden.length) plugin.hideRows(hidden);
    }

    // Build crop toggle switches.
    function buildCropToggles() {
      const container = document.getElementById("cropToggles");
      container.innerHTML = "";
      const crops = [...selectedCrops].sort();
      crops.forEach((crop) => {
        const id = "crop_" + crop.replace(/[^a-z0-9]/gi, "_");
        container.insertAdjacentHTML(
          "beforeend",
          `<div class="toggle-item">
              <label class="toggle-switch">
                <input type="checkbox" checked id="${id}">
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">${crop}</span>
            </div>`,
        );
        container.lastElementChild
          .querySelector("input")
          .addEventListener("change", (event) => {
            if (event.target.checked) selectedCrops.add(crop);
            else selectedCrops.delete(crop);
            applyRowFilter();
            const roleSel = document.querySelector(".role-toggle.active");
            if (roleSel) recalcTotals(roleSel.dataset.role);
          });
      });
    }
  });
}
