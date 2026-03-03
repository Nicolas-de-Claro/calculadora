import { showError, showSuccess, showInfo } from './toast.js';

// ── ESTADO GLOBAL ──
let dbDataHoy = null;
let dbMap = null;
let dbMarkersLayer = null;
let dbMarkersMap = {};
let dbUserMarker = null;
let dbUserCircle = null;
let dbAllMarkersData = [];
let dbCercanasCached = [];
let dbSortState = { col: null, dir: 1 };

let dbLightTileLocal = null;
let dbDarkTileLocal = null;
let dbCurrentTile = null;

// ── APERTURA / CIERRE DEL PANEL ──
export function abrirDashboard() {
    document.getElementById('herramientas-lista').style.display = 'none';
    document.getElementById('dashboard-panel').style.display = '';
    document.querySelector('.main-container').classList.add('dashboard-expanded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (!dbMap) dbInitMap();
    setTimeout(() => { if (dbMap) dbMap.invalidateSize(); }, 320);
}

function cerrarDashboard() {
    document.getElementById('dashboard-panel').style.display = 'none';
    document.getElementById('herramientas-lista').style.display = '';
    document.querySelector('.main-container').classList.remove('dashboard-expanded');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Attach to window so it can be called from script.js (dynamic buttons)
window.abrirDashboard = abrirDashboard;

// ── HELPERS ──
function dbFormatDireccion(p) {
    const dir = (p.direccion || '').trim();
    const alt = (p.altura || '').toString().trim();
    if (dir && alt) return `${dir} ${alt}`;
    return dir || alt || '—';
}

function dbCalcTiempoRelativo(fechaISO) {
    if (!fechaISO) return "—";
    const fecha = new Date(fechaISO);
    if (isNaN(fecha.getTime())) return "—";
    const diffMs = new Date() - fecha;
    const diffDias = Math.floor(diffMs / 86400000);
    if (diffDias === 0) return "Hoy";
    if (diffDias === 1) return "Ayer";
    if (diffDias < 30) return `${diffDias}d`;
    const m = Math.floor(diffDias / 30);
    return m === 1 ? "1 mes" : `${m} meses`;
}

function dbDiasDesde(fechaISO) {
    if (!fechaISO) return 9999;
    const d = new Date(fechaISO);
    if (isNaN(d)) return 9999;
    return Math.floor((new Date() - d) / 86400000);
}

function dbParseFecha(fechaISO) {
    if (!fechaISO) return new Date(0);
    return new Date(fechaISO);
}

function dbGetMapUrl(lat, lon) {
    if (!lat || !lon) return "#";
    return `https://maps.google.com/?q=${lat},${lon}`;
}

function dbRenderMapLink(lat, lon) {
    if (!lat || !lon) return '<span class="db-text-dim">N/A</span>';
    return `<a href="${dbGetMapUrl(lat, lon)}" target="_blank" rel="noopener noreferrer" class="db-map-link">📍 Ver</a>`;
}

// ── EVENT DELEGATION: IR AL MAPA ──
// Avoid inline onclicks by listening globally and matching data attributes
document.addEventListener('click', (e) => {
    // Check if clicked element is a caja link
    const cajaLink = e.target.closest('.db-caja-link');
    if (cajaLink) {
        e.stopPropagation();
        const id = cajaLink.dataset.cajaid;
        const lat = parseFloat(cajaLink.dataset.lat);
        const lon = parseFloat(cajaLink.dataset.lon);
        dbIrACajaEnMapa(id, lat, lon);
        return;
    }

    // Check if map link
    const mapLink = e.target.closest('.db-map-link');
    if (mapLink) {
        e.stopPropagation();
    }
});

function dbIrACajaEnMapa(id, lat, lon) {
    if (!dbMap || !lat || !lon) return;
    document.getElementById('db-btn-reset').classList.add('db-hidden');
    document.querySelectorAll('.db-progress-row').forEach(r => r.classList.remove('active'));
    document.getElementById('db-map-title').textContent = '🗺️ Mapa Interactivo en Terreno';
    dbMap.flyTo([lat, lon], 17, { duration: 0.8 });
    const marker = dbMarkersMap[id];
    if (marker) setTimeout(() => marker.openPopup(), 850);
    document.querySelector('#db-mapa-container').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ── INICIALIZAR MAPA ──
function dbInitMap() {
    if (dbMap) return;
    dbMap = L.map('db-mapa-container').setView([-26.82414, -65.2226], 12);
    
    const theme = document.documentElement.getAttribute('data-theme') || 'light';
    
    dbLightTileLocal = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd', maxZoom: 20
    });
    dbDarkTileLocal = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd', maxZoom: 20
    });

    dbCurrentTile = theme === 'dark' ? dbDarkTileLocal : dbLightTileLocal;
    dbCurrentTile.addTo(dbMap);
    
    dbMarkersLayer = L.layerGroup().addTo(dbMap);
}

// ── TOGGLE PANTALLA COMPLETA ──
function dbToggleFullScreen() {
    const wrapper = document.querySelector('.db-mapa-wrapper');
    const btn = document.getElementById('db-btn-fullscreen');
    wrapper.classList.toggle('db-map-fullscreen');
    
    if (wrapper.classList.contains('db-map-fullscreen')) {
        btn.textContent = '❌';
        btn.title = 'Salir de Pantalla Completa';
        document.body.style.overflow = 'hidden'; 
    } else {
        btn.textContent = '⛶';
        btn.title = 'Pantalla Completa';
        document.body.style.overflow = '';
    }
    
    if (dbMap) {
        setTimeout(() => dbMap.invalidateSize(), 300);
    }
}

// ── DROP ZONE & FILES ──
function dbLimpiarArchivo() {
    dbDataHoy = null;
    document.getElementById('db-file-input').value = "";
    document.getElementById('db-file-info').textContent = "";
    document.getElementById('db-drop-zone').classList.remove('loaded');
    document.getElementById('db-results-container').classList.remove('visible');
    showInfo("Archivo limpiado.");
}

function dbHandleFile(file) {
    if (!file.name.endsWith('.json')) { 
        showError("Formato inválido. Por favor, seleccioná un archivo JSON."); 
        return; 
    }
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const json = JSON.parse(e.target.result);
            let dictData = {};
            let targetArray = json;
            if (json.d && json.d.Result) targetArray = JSON.parse(json.d.Result);
            if (!Array.isArray(targetArray)) { 
                showError("El archivo JSON no tiene el formato esperado (lista de features)."); 
                return; 
            }
            targetArray.forEach(feat => {
                const props = feat.properties || {};
                const sid = props.id || feat.id;
                if (sid) {
                    const coords = (feat.geometry && feat.geometry.coordinates) ? feat.geometry.coordinates : [null, null];
                    dictData[sid] = { ...props, _lon: coords[0], _lat: coords[1], _zona: feat._zona || props._zona || props.olt || "Desconocida" };
                }
            });
            dbDataHoy = dictData;
            document.getElementById('db-drop-zone').classList.add('loaded');
            document.getElementById('db-file-info').textContent = `✅ ${file.name} — ${Object.keys(dictData).length} cajas cargadas`;
            showSuccess("Datos cargados correctamente.");
            dbProcesarData();
        } catch (error) {
            console.error(error);
            showError("Error al leer el archivo JSON: " + error.message);
        }
    };
    reader.readAsText(file);
}

// ── PROCESAMIENTO ──
function dbProcesarData() {
    const container = document.getElementById('db-results-container');
    if (!dbDataHoy) { container.classList.remove('visible'); return; }
    container.classList.add('visible');
    if (!dbMap) dbInitMap();
    setTimeout(() => dbMap.invalidateSize(), 100);
    dbMarkersLayer.clearLayers();
    dbMarkersMap = {};
    dbAllMarkersData = [];

    let total = 0, libres = 0, peligro = 0;
    const topOps = [], virgenes = [], alertaPeligro = [];
    const calorOlt = {};
    const hoyValues = Object.values(dbDataHoy);

    hoyValues.forEach(p => {
        total++;
        const pl = p.puertosLibres || 0;
        const pt = p.puertosTotales || 8;
        libres += pl;
        if (pl === 1) { peligro++; alertaPeligro.push(p); }
        if (pl > 0 && pl === pt) virgenes.push(p);
        if (pl >= 2 && pl < pt)  topOps.push(p);
        const olt = p.olt || "SIN_OLT";
        if (!calorOlt[olt]) calorOlt[olt] = { cajas: 0, libres: 0 };
        calorOlt[olt].cajas++;
        calorOlt[olt].libres += pl;
        if (pl > 0 && p._lat && p._lon) dbAllMarkersData.push(p);
    });

    dbDibujarPinesMapa(dbAllMarkersData);
    document.getElementById('db-stat-total').textContent = total.toLocaleString();
    document.getElementById('db-stat-libres').textContent = libres.toLocaleString();
    document.getElementById('db-stat-virgenes').textContent = virgenes.length.toLocaleString();
    document.getElementById('db-stat-peligro').textContent = peligro.toLocaleString();

    // TOP
    topOps.sort((a, b) => {
        const d = (b.puertosLibres||0) - (a.puertosLibres||0);
        return d !== 0 ? d : dbParseFecha(b.fechaModificacion) - dbParseFecha(a.fechaModificacion);
    });
    const tbodyTop = document.querySelector('#db-table-top tbody');
    tbodyTop.innerHTML = '';
    topOps.slice(0, 30).forEach((p, i) => {
        const sid = p.id;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${i+1}</td>
            <td>
                <strong><span class="db-caja-link" data-cajaid="${sid}" data-lat="${p._lat}" data-lon="${p._lon}">${p.popupContent || '?'}</span></strong><br>
                <span class="db-text-dim" style="font-size:0.75rem">Mov: ${dbCalcTiempoRelativo(p.fechaModificacion)}</span>
            </td>
            <td>${dbFormatDireccion(p).substring(0, 30)}</td>
            <td class="db-text-success" style="font-weight:bold">${p.puertosLibres}/${p.puertosTotales||8}</td>
            <td><span class="db-badge" style="background:var(--input-background);color:var(--text-primary)">${p.olt||'-'}</span></td>
            <td>${dbRenderMapLink(p._lat, p._lon)}</td>
        `;
        tbodyTop.appendChild(tr);
    });

    // CALOR
    const calorContainer = document.getElementById('db-calor-container');
    calorContainer.innerHTML = '';
    const calorArr = Object.entries(calorOlt).sort((a,b) => b[1].libres - a[1].libres);
    const maxLibres = calorArr.length > 0 ? calorArr[0][1].libres : 1;
    calorArr.slice(0, 20).forEach(([olt, data]) => {
        const pct = (data.libres / maxLibres) * 100;
        const div = document.createElement('div');
        div.className = 'db-progress-row';
        div.id = `db-row-olt-${olt.replace(/\s+/g, '-')}`;
        div.setAttribute('data-olt', olt);
        div.innerHTML = `
            <div class="db-progress-label">
                <strong>${olt}</strong>
                <span class="db-text-success">${data.libres} libres</span>
            </div>
            <div class="db-progress-bar-bg"><div class="db-progress-bar-fill" style="width:${pct}%"></div></div>
        `;
        calorContainer.appendChild(div);
    });

    // CAJAS NUEVAS
    virgenes.sort((a, b) => dbParseFecha(b.fechaModificacion) - dbParseFecha(a.fechaModificacion));
    document.getElementById('db-badge-virgenes').textContent = virgenes.length;
    const ulVirgenes = document.getElementById('db-list-virgenes');
    ulVirgenes.innerHTML = '';
    virgenes.forEach(p => {
        const sid = p.id;
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="db-item-info" style="flex:1;min-width:0;">
                <strong><span class="db-caja-link" data-cajaid="${sid}" data-lat="${p._lat}" data-lon="${p._lon}">${p.popupContent || '?'}</span></strong>
                <span>${dbFormatDireccion(p).substring(0,42)}</span>
                <div class="db-text-dim" style="font-size:0.75rem;margin-top:2px;">🆕 Alta: ${dbCalcTiempoRelativo(p.fechaModificacion)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <div class="db-text-success" style="margin-bottom:3px">${p.puertosLibres}/${p.puertosTotales||8}</div>
                ${dbRenderMapLink(p._lat, p._lon)}
            </div>
        `;
        ulVirgenes.appendChild(li);
    });

    // BOCAS LIBRES
    alertaPeligro.sort((a, b) => dbParseFecha(b.fechaModificacion) - dbParseFecha(a.fechaModificacion));
    document.getElementById('db-badge-peligro').textContent = alertaPeligro.length;
    const ulPeligro = document.getElementById('db-list-peligro');
    ulPeligro.innerHTML = '';
    alertaPeligro.forEach(p => {
        const sid = p.id;
        const li = document.createElement('li');
        li.innerHTML = `
            <div class="db-item-info" style="flex:1;min-width:0;">
                <strong><span class="db-caja-link" data-cajaid="${sid}" data-lat="${p._lat}" data-lon="${p._lon}">${p.popupContent || '?'}</span></strong>
                <span>${dbFormatDireccion(p).substring(0,42)}</span>
                <div class="db-text-dim" style="font-size:0.75rem;margin-top:2px;">⚡ Movimiento: ${dbCalcTiempoRelativo(p.fechaModificacion)}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
                <div class="db-text-warning" style="margin-bottom:3px">¡1 LIBRE!</div>
                ${dbRenderMapLink(p._lat, p._lon)}
            </div>
        `;
        ulPeligro.appendChild(li);
    });
}

// ── PINES EN EL MAPA ──
function dbDibujarPinesMapa(pinesData) {
    dbMarkersLayer.clearLayers();
    dbMarkersMap = {};
    const markersArray = [];
    pinesData.forEach(p => {
        const pl = p.puertosLibres || 0;
        const pt = p.puertosTotales || 8;
        let color = '#f39c12';
        if (pl === pt) color = '#27ae60';
        if (pl === 1)  color = '#e53935';
        const cm = L.circleMarker([p._lat, p._lon], {
            radius: 7, fillColor: color, color: '#000', weight: 1, opacity: 1, fillOpacity: 0.85
        });
        cm.bindPopup(`
            <h4>🛒 ${p.popupContent || 'Caja'}</h4>
            <p style="margin-bottom:5px;font-size:12px;">${dbFormatDireccion(p)}</p>
            <p style="margin-bottom:5px;"><strong>Disponibilidad:</strong> <b style="color:${color};font-size:14px;">${pl}/${pt}</b></p>
            <p style="margin-bottom:8px;font-size:12px;">⏳ Últ. Mov.: ${dbCalcTiempoRelativo(p.fechaModificacion)}</p>
            ${dbRenderMapLink(p._lat, p._lon)}
        `);
        markersArray.push(cm);
        dbMarkersLayer.addLayer(cm);
        if (p.id !== undefined) dbMarkersMap[p.id] = cm;
    });
    if (markersArray.length > 0) {
        const group = new L.featureGroup(markersArray);
        dbMap.flyToBounds(group.getBounds(), { padding: [30, 30], duration: 0.5 });
    }
}

function dbFiltrarMapaPorOlt(oltClickeada, rowId) {
    document.querySelectorAll('.db-progress-row').forEach(r => r.classList.remove('active'));
    document.getElementById(rowId).classList.add('active');
    const filterData = dbAllMarkersData.filter(p => (p.olt || "SIN_OLT") === oltClickeada);
    dbDibujarPinesMapa(filterData);
    document.getElementById('db-map-title').innerHTML = `🗺️ Mapa — Zona: <b>${oltClickeada}</b>`;
    document.getElementById('db-btn-reset').classList.remove('db-hidden');
}

function dbRestaurarMapaTotal() {
    document.querySelectorAll('.db-progress-row').forEach(r => r.classList.remove('active'));
    document.getElementById('db-map-title').textContent = '🗺️ Mapa Interactivo en Terreno';
    document.getElementById('db-btn-reset').classList.add('db-hidden');
    dbDibujarPinesMapa(dbAllMarkersData);
}

// ── GEOLOCALIZACIÓN ──
function dbCalcDistance(lat1, lon1, lat2, lon2) {
    const R = 6371, dLat = (lat2-lat1)*Math.PI/180, dLon = (lon2-lon1)*Math.PI/180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1000;
}

function dbGeolocalizar() {
    if (!dbDataHoy) { showError("Primero cargá el archivo JSON del escaneo."); return; }
    if (!navigator.geolocation) { showError("Tu navegador no soporta geolocalización."); return; }
    const btn = document.getElementById('db-btn-geo');
    btn.disabled = true;
    btn.innerHTML = '⏳ Obteniendo GPS...';
    
    // Opcional: CSS animation spinner
    // btn.innerHTML = '<span style="display:inline-block; width:12px; height:12px; border:2px solid; border-radius:50%; border-right-color:transparent; animation:spin 1s linear infinite;"></span> Buscando...';
    
    navigator.geolocation.getCurrentPosition(
        position => {
            const lat = position.coords.latitude, lon = position.coords.longitude;
            btn.disabled = false;
            btn.innerHTML = '🎯 Actualizar mi ubicación';
            if (dbUserMarker) dbMap.removeLayer(dbUserMarker);
            if (dbUserCircle) dbMap.removeLayer(dbUserCircle);
            dbUserMarker = L.marker([lat, lon]).addTo(dbMap).bindPopup("<b>👋 ¡Estás acá!</b>").openPopup();
            dbUserCircle = L.circle([lat, lon], { color:'dodgerblue', fillColor:'dodgerblue', fillOpacity:0.1, radius:400 }).addTo(dbMap);
            dbMap.setView([lat, lon], 16);
            const cercanas = [];
            Object.values(dbDataHoy).forEach(p => {
                if (p._lat && p._lon && p.puertosLibres > 0) {
                    const d = dbCalcDistance(lat, lon, p._lat, p._lon);
                    if (d <= 400) cercanas.push({ p, dist: d, dias: dbDiasDesde(p.fechaModificacion), libres: p.puertosLibres || 0 });
                }
            });
            cercanas.sort((a,b) => a.dist - b.dist);
            dbCercanasCached = cercanas;
            dbSortState = { col: 'dist', dir: 1 };
            dbActualizarSortHeaders('dist', 1);
            dbRenderCercanas(cercanas);
            document.getElementById('db-badge-cercanas').textContent = cercanas.length;
            document.getElementById('db-cercanas-container').classList.remove('db-hidden');
            showSuccess(`Ubicación actualizada. Encontramos ${cercanas.length} opciones cerca.`);
        },
        error => {
            btn.disabled = false;
            btn.innerHTML = '🎯 Cajas cerca de mí';
            showError(`Error de GPS: ${error.message}. Asegurate de dar permisos de ubicación.`);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}

function dbRenderCercanas(lista) {
    const tbody = document.querySelector('#db-table-cercanas tbody');
    tbody.innerHTML = '';
    if (lista.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No hay splitters con disponibilidad en un radio de 400m.</td></tr>`;
        return;
    }
    lista.forEach(item => {
        const p = item.p;
        const sid = p.id;
        let clr = '#f39c12';
        if (p.puertosLibres === (p.puertosTotales||8)) clr = '#27ae60';
        if (p.puertosLibres === 1) clr = '#e53935';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${Math.round(item.dist)}m</strong></td>
            <td><strong><span class="db-caja-link" data-cajaid="${sid}" data-lat="${p._lat}" data-lon="${p._lon}">${p.popupContent || 'Caja'}</span></strong></td>
            <td>${dbFormatDireccion(p).substring(0, 28)}</td>
            <td><b style="color:${clr}">${p.puertosLibres}/${p.puertosTotales||8}</b></td>
            <td class="db-text-dim">${dbCalcTiempoRelativo(p.fechaModificacion)}</td>
            <td><a href="${dbGetMapUrl(p._lat, p._lon)}" target="_blank" rel="noopener noreferrer" class="db-btn-gps" style="padding:5px 12px;font-size:12px;text-decoration:none;">📍 Ir</a></td>
        `;
        tbody.appendChild(tr);
    });
}

// ── SORT CERCANAS ──
function dbActualizarSortHeaders(colActiva, dir) {
    document.querySelectorAll('#db-table-cercanas th.db-sortable').forEach(th => {
        th.classList.remove('db-sorted-asc', 'db-sorted-desc');
        if (th.dataset.col === colActiva) th.classList.add(dir === 1 ? 'db-sorted-asc' : 'db-sorted-desc');
    });
}

// ── EVENT LISTENERS HOOKING ──
export function initDashboardEventBindings() {
    // Dropzone logic
    const dz = document.getElementById('db-drop-zone');
    const fi = document.getElementById('db-file-input');
    
    if (dz) {
        dz.addEventListener('click', () => fi.click());
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
        dz.addEventListener('drop', e => {
            e.preventDefault(); dz.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) dbHandleFile(e.dataTransfer.files[0]);
        });
    }

    if (fi) {
        fi.addEventListener('change', e => {
            if (e.target.files.length > 0) dbHandleFile(e.target.files[0]);
        });
    }

    // Buttons
    document.getElementById('db-btn-limpiar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        dbLimpiarArchivo();
    });

    document.querySelector('.db-btn-cargar')?.addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('db-file-input').click();
    });

    document.getElementById('db-btn-reset')?.addEventListener('click', dbRestaurarMapaTotal);
    document.getElementById('db-btn-geo')?.addEventListener('click', dbGeolocalizar);
    document.getElementById('db-btn-fullscreen')?.addEventListener('click', dbToggleFullScreen);

    // Sidebar Calor Progress row click delegation
    document.getElementById('db-calor-container')?.addEventListener('click', (e) => {
        const row = e.target.closest('.db-progress-row');
        if (row) {
            dbFiltrarMapaPorOlt(row.dataset.olt, row.id);
        }
    });

    document.getElementById('db-btn-cerrar')?.addEventListener('click', cerrarDashboard);

    // Sorted Headers
    document.querySelectorAll('#db-table-cercanas th.db-sortable').forEach(th => {
        th.addEventListener('click', () => {
            const col = th.dataset.col, tipo = th.dataset.tipo;
            let dir = 1;
            if (dbSortState.col === col) dir = dbSortState.dir * -1;
            dbSortState = { col, dir };
            const sorted = [...dbCercanasCached].sort((a, b) => {
                const va = a[col], vb = b[col];
                return tipo === 'num' ? (va - vb) * dir : String(va).localeCompare(String(vb)) * dir;
            });
            dbActualizarSortHeaders(col, dir);
            dbRenderCercanas(sorted);
        });
    });

    // Theme Observer
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                if (!dbMap || !dbLightTileLocal || !dbDarkTileLocal) return;
                const newTheme = document.documentElement.getAttribute('data-theme') || 'light';
                const newTile = newTheme === 'dark' ? dbDarkTileLocal : dbLightTileLocal;
                
                if (dbCurrentTile !== newTile) {
                    dbMap.removeLayer(dbCurrentTile);
                    newTile.addTo(dbMap);
                    dbCurrentTile = newTile;
                }
            }
        });
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

// Call init on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDashboardEventBindings);
} else {
    initDashboardEventBindings();
}
