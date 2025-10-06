import { onDocumentReady } from '../utils/dom.js';
import { withBasePath } from '../utils/paths.js';

export function initKpiBuilder() {
  onDocumentReady(() => {
      // Constants
      const roleCols = {
        Farm: ['Produce','Category','Farm Cost $/lb','Farm Markup %','Farm Sale $/lb',
               'Farm Shrink %','Farm GP $/lb','Farm GM %','Qty lbs'],
        Distributor:['Produce','Category','Farm Sale $/lb','Dist Handling $/lb','Dist Margin %',
                     'Dist Sale $/lb','Dist Shrink %','Dist GP $/lb','Dist GM %','Qty lbs'],
        Bodega: ['Produce','Category','Dist. Sale $/lb','Retail Handling $/lb','Retail Margin %',
                 'Retail Price $/lb','Bodega Shrink %','Bodega GP $/lb','Bodega GM %','Qty lbs']
      };
      const kpiDefs = [
        'Farm GP $/lb','Farm GM %',
        'Dist. GP $/lb','Dist. GM %',
        'Bodega GP $/lb','Bodega GM %'
      ];
      // Globals
      let hot, hotData = [], colHeaders = [];
      let currentRole = null; // 'Farm' | 'Distributor' | 'Bodega'
      const userVisible = new Set();   // columns user forced visible
      const userHidden  = new Set();   // columns user forced hidden
      let selectedCrops = new Set();   // produce items to include
    
      // Utility
      const round = (v,d=2)=> (isFinite(v)? +(+v).toFixed(d): 0);
    
      // Recalculate a single row according to provided formulas
      function recalcRow(rIdx){
        const d = hot.getSourceDataAtRow(rIdx);
        // ensure numbers
        Object.keys(d).forEach(k=>{ if(d[k]==='') d[k]=0; d[k]=Number(d[k]) || d[k]; });
    
        d['Farm Sale $/lb']    = d['Farm Cost $/lb'] * (1 + d['Farm Markup %']/100);
        d['Dist Sale $/lb']   = (d['Farm Sale $/lb'] + d['Dist Handling $/lb']) * (1 + d['Dist Margin %']/100);
        d['Retail Price $/lb'] = (d['Dist Sale $/lb'] + d['Retail Handling $/lb']) * (1 + d['Retail Margin %']/100);
    
        d['Farm GP $/lb']      = d['Farm Sale $/lb'] - d['Farm Cost $/lb'];
        d['Farm GM %']         = d['Farm Sale $/lb'] ? 100*d['Farm GP $/lb']/d['Farm Sale $/lb'] : 0;
        d['Dist GP $/lb']     = d['Dist Sale $/lb'] - d['Farm Sale $/lb'] - d['Dist Handling $/lb'];
        d['Dist GM %']        = d['Dist Sale $/lb'] ? 100*d['Dist GP $/lb']/d['Dist Sale $/lb'] : 0;
        d['Bodega GP $/lb']    = (d['Retail Price $/lb']*(1 - d['Bodega Shrink %']/100)) - d['Dist Sale $/lb'] - d['Retail Handling $/lb'];
        d['Bodega GM %']       = d['Retail Price $/lb'] ? 100*d['Bodega GP $/lb']/d['Retail Price $/lb'] : 0;
      }
    
      // Stand-alone compute function (does not depend on Handsontable instance)
      function computeRowObj(d){
        // ensure numbers
        Object.keys(d).forEach(k=>{ if(d[k]==='') d[k]=0; d[k]=Number(d[k]) || d[k]; });
    
        d['Farm Sale $/lb']    = d['Farm Cost $/lb'] * (1 + d['Farm Markup %']/100);
        d['Dist Sale $/lb']   = (d['Farm Sale $/lb'] + d['Dist Handling $/lb']) * (1 + d['Dist Margin %']/100);
        d['Retail Price $/lb'] = (d['Dist Sale $/lb'] + d['Retail Handling $/lb']) * (1 + d['Retail Margin %']/100);
    
        d['Farm GP $/lb']      = d['Farm Sale $/lb'] - d['Farm Cost $/lb'];
        d['Farm GM %']         = d['Farm Sale $/lb'] ? 100*d['Farm GP $/lb']/d['Farm Sale $/lb'] : 0;
        d['Dist GP $/lb']     = d['Dist Sale $/lb'] - d['Farm Sale $/lb'] - d['Dist Handling $/lb'];
        d['Dist GM %']        = d['Dist Sale $/lb'] ? 100*d['Dist GP $/lb']/d['Dist Sale $/lb'] : 0;
        d['Bodega GP $/lb']    = (d['Retail Price $/lb']*(1 - d['Bodega Shrink %']/100)) - d['Dist Sale $/lb'] - d['Retail Handling $/lb'];
        d['Bodega GM %']       = d['Retail Price $/lb'] ? 100*d['Bodega GP $/lb']/d['Retail Price $/lb'] : 0;
      }
    
      function recalcTotals(role){
        console.log('TOT-DEBUG', role);
        if (role === 'Distributor') {
      console.table(hot.getSourceData().slice(0,3),
                    ['Produce','Dist. Sale $/lb','Dist. GP $/lb','Qty lbs']);
    }
        const data = hot.getSourceData();
        let rev=0, gp=0, qty=0;
        data.forEach(d=>{
          if(!selectedCrops.has(d['Produce'])) return; // respect crop filter
          const q = Number(d['Qty lbs']) || 0; if(!q) return;
          qty += q;
          const num = v=>Number(v)||0;
          if(role==='Farm'){
            rev += num(d['Farm Sale $/lb'])*q;
            gp  += num(d['Farm GP $/lb'])*q;
          } else if(role==='Distributor'){
            rev += num(d['Dist Sale $/lb'])*q;
            gp  += num(d['Dist GP $/lb'])*q;
          } else if(role==='Bodega'){
            rev += num(d['Retail Price $/lb'])*(1-num(d['Bodega Shrink %'])/100)*q;
            gp  += num(d['Bodega GP $/lb'])*q;
          }
        });
        const gm = rev ? (100*gp/rev) : 0;
        const html = `<ul class="list-unstyled mb-0">
           <li><strong>Total Qty (lbs):</strong> ${round(qty,0)}</li>
           <li><strong>Total Revenue ($):</strong> ${round(rev,2)}</li>
           <li><strong>Total GP ($):</strong> ${round(gp,2)}</li>
           <li><strong>Gross Margin %:</strong> ${round(gm,1)}</li>
         </ul>`;
        document.getElementById('totalsContent').innerHTML = html;
      }
    
      function applyVisibility(){
        const hiddenIdx=[];
        colHeaders.forEach((h,i)=>{
          if(h==='Produce' || h==='Category'){ return; } // always visible
          let visible=false;
          if(userVisible.has(h)) visible = true;
          else if(userHidden.has(h)) visible = false;
          else if(currentRole && roleCols[currentRole].includes(h)) visible = true;
          else visible = false;
          if(!visible) hiddenIdx.push(i);
        });
        const plugin = hot.getPlugin('hiddenColumns');
        // show all first then hide desired to ensure reset
        plugin.showColumns(colHeaders.map((_,i)=>i));
        if(hiddenIdx.length) plugin.hideColumns(hiddenIdx);
        hot.render();
      }
    
      function setRole(role){
        currentRole = role;
        document.getElementById('totalsCard').classList.remove('d-none');
        applyVisibility();
        // recompute every row so distributor columns are filled
        hot.getSourceData().forEach((_,idx)=>recalcRow(idx));
        recalcTotals(role);
      }
      function buildColumnDefs(){
        return colHeaders.map(h=>{
          const readOnly = h==='Produce'||h==='Category'||kpiDefs.includes(h);
          const isPercent=h.includes('%');
          const isNumeric=h.includes('$')||isPercent||h==='Qty lbs'||kpiDefs.includes(h);
          return {
            data:h,
            readOnly,
            type:isNumeric?'numeric':'text',
            numericFormat:isNumeric?{pattern:isPercent?'0.0':'0.00'}:undefined
          };
        });
      }
      function buildColumnToggles(){
        const container=document.getElementById('columnToggles');
        container.innerHTML='';
        colHeaders.forEach((h,i)=>{
          const id='chk_'+i;
          const isDisabled = h==='Produce'||h==='Category';
          container.insertAdjacentHTML('beforeend',
          `<div class="toggle-item">
            <label class="toggle-switch">
              <input type="checkbox" ${isDisabled?'checked disabled':''} checked id="${id}">
              <span class="toggle-slider"></span>
            </label>
            <span class="toggle-label ${isDisabled?'disabled':''}">${h}</span>
          </div>`);
          container.lastElementChild.querySelector('input').addEventListener('change',e=>{
            if(e.target.disabled) return;
            if(e.target.checked) { userVisible.add(h); userHidden.delete(h); } else { userHidden.add(h); userVisible.delete(h); }
            applyVisibility();
          });
        });
      }
      // Draggable offcanvas
      function enableDrag(el,handle){let sx,sy,ox,oy,drag=false;
        handle.addEventListener('mousedown',e=>{drag=true;el.classList.add('draggable');sx=e.clientX;sy=e.clientY;const r=el.getBoundingClientRect();ox=r.left;oy=r.top;document.addEventListener('mousemove',mv);document.addEventListener('mouseup',up);});
        function mv(e){if(!drag)return;el.style.transform='none';el.style.left=(ox+e.clientX-sx)+'px';el.style.top=(oy+e.clientY-sy)+'px';}
        function up(){drag=false;el.classList.remove('draggable');document.removeEventListener('mousemove',mv);document.removeEventListener('mouseup',up);} }
    
      // Accordion toggle (simple)
      document.addEventListener('click',e=>{if(e.target.classList.contains('accordion-button')){const b=e.target,c=b.parentElement.nextElementSibling;b.classList.toggle('collapsed');c.classList.toggle('show');}});
    
      // Offcanvas show/hide
      const offcanvas = document.getElementById('columnOptions');
      const backdrop = document.getElementById('offcanvasBackdrop');
      
      console.log('Offcanvas element:', offcanvas);
      console.log('Backdrop element:', backdrop);
      
      function openOffcanvas() {
        offcanvas.classList.add('show');
        backdrop.classList.add('show');
        document.body.classList.add('offcanvas-open');
        console.log('Offcanvas opened:', offcanvas.classList.contains('show'));
        console.log('Offcanvas content:', offcanvas.innerHTML);
        console.log('Column toggles:', document.getElementById('columnToggles').innerHTML);
        console.log('Crop toggles:', document.getElementById('cropToggles').innerHTML);
      }
      
      function closeOffcanvas() {
        offcanvas.classList.remove('show');
        backdrop.classList.remove('show');
        document.body.classList.remove('offcanvas-open');
      }
      
      // Ensure gear button works on all devices
      const gearBtn = document.getElementById('gearBtn');
      if (gearBtn) {
        gearBtn.onclick = openOffcanvas;
        console.log('Gear button found and configured');
      } else {
        console.error('Gear button not found!');
      }
      document.getElementById('closeCanvas').onclick = closeOffcanvas;
      backdrop.onclick = closeOffcanvas;
      
      // Close on escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && offcanvas.classList.contains('show')) {
          closeOffcanvas();
        }
      });
      
      enableDrag(offcanvas, offcanvas.querySelector('.offcanvas-header'));
    
      // Load CSV & init Handsontable
      Papa.parse(withBasePath('data/Supply_Chain_KPI_Builder.csv'),{
        download:true,header:true,dynamicTyping:true,complete:(res)=>{
          hotData=res.data.filter(r=>r.Produce);
          // Normalize distributor keys (remove dot after Dist) to avoid nested path issues
          hotData.forEach(r=>{
            if('Dist. Sale $/lb' in r){ r['Dist Sale $/lb']=r['Dist. Sale $/lb']; delete r['Dist. Sale $/lb']; }
            if('Dist. Margin %' in r){ r['Dist Margin %']=r['Dist. Margin %']; delete r['Dist. Margin %']; }
            if('Dist. Handling $/lb' in r){ r['Dist Handling $/lb']=r['Dist. Handling $/lb']; delete r['Dist. Handling $/lb']; }
            if('Dist. Shrink %' in r){ r['Dist Shrink %']=r['Dist. Shrink %']; delete r['Dist. Shrink %']; }
          });
          hotData.forEach(computeRowObj); // compute before Handsontable exists
          colHeaders=Object.keys(hotData[0]);
          const container=document.getElementById('hot');
          hot=new Handsontable(container,{
            data:hotData,
            colHeaders,
            columns:buildColumnDefs(),
            licenseKey:'non-commercial-and-evaluation',
            stretchH:'all',
            height:'100%',
            rowHeaders: true,
            colWidths: 120,
            rowHeights: 35,
            hiddenColumns:{columns:[],indicators:true},
            hiddenRows:{rows:[],indicators:true},
            afterChange:(changes,src)=>{
              if(src==='loadData'||!changes)return;
              new Set(changes.map(c=>c[0])).forEach(r=>recalcRow(r));
              hot.render();
              const roleSel=document.querySelector('input[name="role"]:checked');
              if(roleSel) recalcTotals(roleSel.value);
            }
          });
          // initialize crop set then UI
          hotData.forEach(r=>selectedCrops.add(r['Produce']));
          buildCropToggles();
          buildColumnToggles();
          applyRowFilter();
          
          // Ensure gear button works after content is loaded
          console.log('Content loaded, gear button should work now');
          console.log('Column toggles built:', document.getElementById('columnToggles').children.length);
          console.log('Crop toggles built:', document.getElementById('cropToggles').children.length);
        }
      });
      // Role toggle listeners
      document.querySelectorAll('.role-toggle').forEach(btn => {
        btn.addEventListener('click', e => {
          // Remove active class from all buttons
          document.querySelectorAll('.role-toggle').forEach(b => b.classList.remove('active'));
          // Add active class to clicked button
          e.target.classList.add('active');
          // Set the role
          setRole(e.target.dataset.role);
        });
      });
    
      function applyRowFilter(){
        const hidden=[];
        hotData.forEach((row,idx)=>{
          if(!selectedCrops.has(row['Produce'])) hidden.push(idx);
        });
        const plugin=hot.getPlugin('hiddenRows');
        plugin.showRows([...Array(hotData.length).keys()]);
        if(hidden.length) plugin.hideRows(hidden);
      }
    
      function buildCropToggles(){
        const container=document.getElementById('cropToggles');
        container.innerHTML='';
        const crops=[...selectedCrops].sort();
        crops.forEach(c=>{
          const id='crop_'+c.replace(/[^a-z0-9]/gi,'_');
          container.insertAdjacentHTML('beforeend',
            `<div class="toggle-item">
              <label class="toggle-switch">
                <input type="checkbox" checked id="${id}">
                <span class="toggle-slider"></span>
              </label>
              <span class="toggle-label">${c}</span>
            </div>`);
          container.lastElementChild.querySelector('input').addEventListener('change',e=>{
            if(e.target.checked) selectedCrops.add(c); else selectedCrops.delete(c);
            applyRowFilter();
            const roleSel=document.querySelector('.role-toggle.active');
            if(roleSel) recalcTotals(roleSel.dataset.role);
          });
        });
      }
  });
}


