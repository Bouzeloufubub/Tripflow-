/* =========================================================
   TRIPFLOW — APP.JS
   ========================================================= */

"use strict";

const STORAGE_KEY = "tripflow_data";
const THEME_KEY = "tripflow_theme";

let state = {
    trips: [],
    currentTripId: null
};

let map = null;
let mapLayers = [];


/* =========================================================
   INITIALISATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    loadData();
    setupTheme();
    setupEvents();
    initMap();
    updateUI();
});


/* =========================================================
   DONNÉES
========================================================= */

function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return;

    try {
        const parsed = JSON.parse(saved);

        if (parsed && Array.isArray(parsed.trips)) {
            state = parsed;
        }
    } catch (error) {
        console.error("Erreur LocalStorage :", error);
    }
}


function saveData() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}


function getCurrentTrip() {
    return state.trips.find(
        trip => trip.id === state.currentTripId
    ) || null;
}


/* =========================================================
   NAVIGATION
========================================================= */

function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
        page.classList.remove("active");
    });

    const page = document.getElementById(pageId);

    if (page) {
        page.classList.add("active");
    }

    closeMenu();

    if (pageId === "home" && map) {
        setTimeout(() => {
            map.invalidateSize();
            refreshMap();
        }, 150);
    }
}


function openMenu() {
    document
        .getElementById("sideMenu")
        ?.classList.add("open");

    document
        .getElementById("overlay")
        ?.classList.add("show");
}


function closeMenu() {
    document
        .getElementById("sideMenu")
        ?.classList.remove("open");

    document
        .getElementById("overlay")
        ?.classList.remove("show");
}


/* =========================================================
   ÉVÉNEMENTS
========================================================= */

function setupEvents() {

    document
        .getElementById("menuBtn")
        ?.addEventListener("click", openMenu);


    document
        .getElementById("overlay")
        ?.addEventListener("click", closeMenu);


    document
        .querySelectorAll("#sideMenu button[data-page]")
        .forEach(button => {
            button.addEventListener("click", () => {
                showPage(button.dataset.page);
            });
        });


    document
        .getElementById("themeBtn")
        ?.addEventListener("click", toggleTheme);


    document
        .getElementById("darkToggle")
        ?.addEventListener("click", toggleTheme);


    document
        .getElementById("addTripBtn")
        ?.addEventListener("click", createTrip);


    document
        .getElementById("addStopBtn")
        ?.addEventListener("click", openAddStopPage);


    document
        .getElementById("backStopBtn")
        ?.addEventListener("click", () => {
            showPage("stops");
        });


    document
        .getElementById("saveStopBtn")
        ?.addEventListener("click", saveStop);


    document
        .getElementById("addRouteBtn")
        ?.addEventListener("click", () => {
            alert(
                "La création des trajets sera disponible dans la prochaine amélioration."
            );
        });


    document
        .getElementById("clearData")
        ?.addEventListener("click", clearAllData);
}


/* =========================================================
   THÈME
========================================================= */

function setupTheme() {
    const savedTheme =
        localStorage.getItem(THEME_KEY);

    if (savedTheme === "dark") {
        document.body.classList.add("dark");
    }
}


function toggleTheme() {
    document.body.classList.toggle("dark");

    const dark =
        document.body.classList.contains("dark");

    localStorage.setItem(
        THEME_KEY,
        dark ? "dark" : "light"
    );
}


/* =========================================================
   CARTE LEAFLET
========================================================= */

function initMap() {

    const mapElement =
        document.getElementById("map");

    if (!mapElement || typeof L === "undefined") {
        console.warn("Leaflet ou la carte est introuvable.");
        return;
    }

    map = L.map("map", {
        zoomControl: true
    }).setView(
        [46.603354, 1.888334],
        5
    );


    L.tileLayer(
        "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        {
            maxZoom: 19,
            attribution:
                '&copy; OpenStreetMap contributors'
        }
    ).addTo(map);


    refreshMap();
}


function clearMap() {

    mapLayers.forEach(layer => {

        if (map) {
            map.removeLayer(layer);
        }

    });

    mapLayers = [];
}


function refreshMap() {

    if (!map) return;

    clearMap();

    const trip = getCurrentTrip();

    if (!trip || trip.stops.length === 0) {
        map.setView(
            [46.603354, 1.888334],
            5
        );

        return;
    }


    const coordinates = [];


    trip.stops.forEach(stop => {

        if (
            typeof stop.lat !== "number" ||
            typeof stop.lng !== "number"
        ) {
            return;
        }


        const marker =
            L.marker(
                [stop.lat, stop.lng],
                {
                    icon: createStopIcon(stop.type)
                }
            );


        marker.bindPopup(`
            <div class="map-popup">
                <strong>
                    ${escapeHTML(stop.name)}
                </strong>
                <span>
                    ${escapeHTML(stop.place)}
                </span>
            </div>
        `);


        marker.addTo(map);

        mapLayers.push(marker);

        coordinates.push([
            stop.lat,
            stop.lng
        ]);
    });


    if (coordinates.length > 1) {

        const route =
            L.polyline(
                coordinates,
                {
                    color: "#2563eb",
                    weight: 5,
                    opacity: 0.85,
                    lineCap: "round",
                    lineJoin: "round"
                }
            ).addTo(map);

        mapLayers.push(route);
    }


    if (coordinates.length === 1) {

        map.setView(
            coordinates[0],
            13
        );

    } else if (coordinates.length > 1) {

        map.fitBounds(
            coordinates,
            {
                padding: [35, 35]
            }
        );
    }
}


/* =========================================================
   ICÔNES CARTE
========================================================= */

function createStopIcon(type) {

    const icons = {
        hotel: "bed",
        restaurant: "utensils",
        museum: "building-columns",
        beach: "umbrella-beach",
        home: "house",
        visit: "camera"
    };


    const icon =
        icons[type] || "location-dot";


    return L.divIcon({

        className: "custom-marker",

        html:
            `<i class="fa-solid fa-${icon}"></i>`,

        iconSize: [40, 40],

        iconAnchor: [20, 20],

        popupAnchor: [0, -20]
    });
}


/* =========================================================
   VOYAGES
========================================================= */

function createTrip() {

    const name =
        prompt("Nom de votre nouveau voyage :");


    if (!name || !name.trim()) {
        return;
    }


    const trip = {

        id:
            Date.now().toString(),

        name:
            name.trim(),

        stops: [],

        routes: [],

        createdAt:
            new Date().toISOString()
    };


    state.trips.push(trip);

    state.currentTripId =
        trip.id;


    saveData();

    updateUI();

    showPage("home");
}


function selectTrip(id) {

    const trip =
        state.trips.find(
            item => item.id === id
        );


    if (!trip) return;


    state.currentTripId = id;

    saveData();

    updateUI();

    showPage("home");
}


function renameTrip(id) {

    const trip =
        state.trips.find(
            item => item.id === id
        );


    if (!trip) return;


    const name =
        prompt(
            "Nouveau nom du voyage :",
            trip.name
        );


    if (!name || !name.trim()) {
        return;
    }


    trip.name =
        name.trim();


    saveData();

    updateUI();
}


function deleteTrip(id) {

    const trip =
        state.trips.find(
            item => item.id === id
        );


    if (!trip) return;


    const confirmed =
        confirm(
            `Supprimer "${trip.name}" ?`
        );


    if (!confirmed) return;


    state.trips =
        state.trips.filter(
            item => item.id !== id
        );


    if (state.currentTripId === id) {

        state.currentTripId =
            state.trips.length
                ? state.trips[0].id
                : null;
    }


    saveData();

    updateUI();
}


/* =========================================================
   AJOUT D'UN ARRÊT
========================================================= */

function openAddStopPage() {

    const trip =
        getCurrentTrip();


    if (!trip) {

        alert(
            "Créez d'abord un voyage."
        );

        showPage("trips");

        return;
    }


    resetStopForm();

    showPage("addStopPage");
}


function resetStopForm() {

    const ids = [
        "stopName",
        "stopPlace",
        "stopDate",
        "stopPrice",
        "stopNotes"
    ];


    ids.forEach(id => {

        const element =
            document.getElementById(id);

        if (element) {
            element.value = "";
        }
    });


    const type =
        document.getElementById("stopType");

    if (type) {
        type.value = "visit";
    }
}


/* =========================================================
   SAUVEGARDE ARRÊT
========================================================= */

async function saveStop() {

    const trip =
        getCurrentTrip();


    if (!trip) {
        alert("Aucun voyage sélectionné.");
        return;
    }


    const name =
        document
            .getElementById("stopName")
            ?.value
            .trim();


    const place =
        document
            .getElementById("stopPlace")
            ?.value
            .trim();


    const type =
        document
            .getElementById("stopType")
            ?.value || "visit";


    const date =
        document
            .getElementById("stopDate")
            ?.value || "";


    const priceValue =
        document
            .getElementById("stopPrice")
            ?.value;


    const price =
        Number(priceValue) || 0;


    const notes =
        document
            .getElementById("stopNotes")
            ?.value
            .trim() || "";


    if (!name) {

        alert(
            "Veuillez entrer un nom pour l'arrêt."
        );

        return;
    }


    if (!place) {

        alert(
            "Veuillez entrer un lieu."
        );

        return;
    }


    const button =
        document.getElementById(
            "saveStopBtn"
        );


    if (button) {

        button.disabled = true;

        button.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            <span>Recherche du lieu...</span>
        `;
    }


    try {

        const location =
            await geocodePlace(place);


        if (!location) {

            alert(
                "Lieu introuvable. Essayez avec une adresse ou une ville plus précise."
            );

            return;
        }


        const stop = {

            id:
                Date.now().toString(),

            name,

            place,

            type,

            date,

            price,

            notes,

            lat:
                location.lat,

            lng:
                location.lng
        };


        trip.stops.push(stop);

        saveData();

        updateUI();

        resetStopForm();

        showPage("stops");


    } catch (error) {

        console.error(error);

        alert(
            "Une erreur est survenue lors de la recherche du lieu."
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.innerHTML = `
                <i class="fa-solid fa-check"></i>
                <span>Enregistrer l'arrêt</span>
            `;
        }
    }
}


/* =========================================================
   RECHERCHE OPENSTREETMAP
========================================================= */

async function geocodePlace(query) {

    const url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=json" +
        "&limit=1" +
        "&q=" +
        encodeURIComponent(query);


    const response =
        await fetch(url, {
            headers: {
                "Accept":
                    "application/json"
            }
        });


    if (!response.ok) {
        throw new Error(
            "Erreur Nominatim"
        );
    }


    const results =
        await response.json();


    if (
        !Array.isArray(results) ||
        results.length === 0
    ) {
        return null;
    }


    return {

        lat:
            Number(results[0].lat),

        lng:
            Number(results[0].lon)
    };
}


/* =========================================================
   AFFICHAGE DES ARRÊTS
========================================================= */

function renderStops() {

    const container =
        document.getElementById(
            "stopsList"
        );


    if (!container) return;


    container.innerHTML = "";


    const trip =
        getCurrentTrip();


    if (!trip) {

        container.innerHTML = emptyCard(
            "Aucun voyage sélectionné",
            "Créez ou sélectionnez un voyage pour commencer."
        );

        return;
    }


    if (trip.stops.length === 0) {

        container.innerHTML = emptyCard(
            "Aucun arrêt",
            "Ajoutez votre première étape à cet itinéraire."
        );

        return;
    }


    trip.stops.forEach(stop => {

        const card =
            document.createElement("div");


        card.className =
            "item-card";


        card.innerHTML = `

            <h3>
                ${escapeHTML(stop.name)}
            </h3>

            <p>
                <i class="fa-solid fa-location-dot"></i>
                ${escapeHTML(stop.place)}
            </p>

            <p>
                <i class="fa-solid fa-tag"></i>
                ${formatStopType(stop.type)}
            </p>

            ${
                stop.date
                    ? `
                        <p>
                            <i class="fa-solid fa-calendar"></i>
                            ${formatDate(stop.date)}
                        </p>
                    `
                    : ""
            }

            ${
                stop.price > 0
                    ? `
                        <p>
                            <i class="fa-solid fa-euro-sign"></i>
                            ${formatPrice(stop.price)}
                        </p>
                    `
                    : ""
            }

            ${
                stop.notes
                    ? `
                        <p>
                            ${escapeHTML(stop.notes)}
                        </p>
                    `
                    : ""
            }

            <div class="trip-actions">

                <button
                    type="button"
                    data-delete-stop="${stop.id}"
                >
                    <i class="fa-solid fa-trash"></i>
                    Supprimer
                </button>

            </div>
        `;


        const deleteButton =
            card.querySelector(
                `[data-delete-stop="${stop.id}"]`
            );


        deleteButton?.addEventListener(
            "click",
            () => deleteStop(stop.id)
        );


        container.appendChild(card);
    });
}


function deleteStop(id) {

    const trip =
        getCurrentTrip();


    if (!trip) return;


    const stop =
        trip.stops.find(
            item => item.id === id
        );


    if (!stop) return;


    if (
        !confirm(
            `Supprimer "${stop.name}" ?`
        )
    ) {
        return;
    }


    trip.stops =
        trip.stops.filter(
            item => item.id !== id
        );


    saveData();

    updateUI();
}


/* =========================================================
   TRAJETS
========================================================= */

function renderRoutes() {

    const container =
        document.getElementById(
            "routesList"
        );


    if (!container) return;


    container.innerHTML = "";


    const trip =
        getCurrentTrip();


    if (!trip) {

        container.innerHTML = emptyCard(
            "Aucun voyage sélectionné",
            "Sélectionnez un voyage."
        );

        return;
    }


    if (trip.routes.length === 0) {

        container.innerHTML = emptyCard(
            "Aucun trajet",
            "Vos trajets apparaîtront ici."
        );

        return;
    }


    trip.routes.forEach(route => {

        container.innerHTML += `

            <div class="item-card">

                <h3>
                    ${escapeHTML(route.start)}
                    →
                    ${escapeHTML(route.end)}
                </h3>

                <p>
                    <i class="fa-solid fa-car"></i>
                    ${escapeHTML(route.transport)}
                </p>

                ${
                    route.price
                        ? `
                            <p>
                                ${formatPrice(route.price)}
                            </p>
                        `
                        : ""
                }

            </div>
        `;
    });
}


/* =========================================================
   VOYAGES
========================================================= */

function renderTrips() {

    const container =
        document.getElementById(
            "tripsList"
        );


    if (!container) return;


    container.innerHTML = "";


    if (state.trips.length === 0) {

        container.innerHTML = emptyCard(
            "Aucun voyage",
            "Créez votre premier voyage."
        );

        return;
    }


    state.trips.forEach(trip => {

        const card =
            document.createElement("div");


        card.className =
            "item-card";


        if (
            trip.id ===
            state.currentTripId
        ) {
            card.classList.add(
                "active-trip"
            );
        }


        card.innerHTML = `

            <h3>
                ${escapeHTML(trip.name)}
            </h3>

            <p>
                ${trip.stops.length}
                arrêt${trip.stops.length > 1 ? "s" : ""}
                ·
                ${trip.routes.length}
                trajet${trip.routes.length > 1 ? "s" : ""}
            </p>

            <div class="trip-actions">

                <button
                    type="button"
                    data-open
                >
                    <i class="fa-solid fa-arrow-right"></i>
                    Ouvrir
                </button>

                <button
                    type="button"
                    data-rename
                >
                    <i class="fa-solid fa-pen"></i>
                    Modifier
                </button>

                <button
                    type="button"
                    data-delete
                >
                    <i class="fa-solid fa-trash"></i>
                    Supprimer
                </button>

            </div>
        `;


        card
            .querySelector("[data-open]")
            ?.addEventListener(
                "click",
                () => selectTrip(trip.id)
            );


        card
            .querySelector("[data-rename]")
            ?.addEventListener(
                "click",
                () => renameTrip(trip.id)
            );


        card
            .querySelector("[data-delete]")
            ?.addEventListener(
                "click",
                () => deleteTrip(trip.id)
            );


        container.appendChild(card);
    });
}


/* =========================================================
   STATISTIQUES
========================================================= */

function updateStats() {

    const trip =
        getCurrentTrip();


    const stopCount =
        document.getElementById(
            "stopCount"
        );


    const routeCount =
        document.getElementById(
            "routeCount"
        );


    const budgetTotal =
        document.getElementById(
            "budgetTotal"
        );


    const durationTotal =
        document.getElementById(
            "durationTotal"
        );


    if (!trip) {

        if (stopCount)
            stopCount.textContent = "0";

        if (routeCount)
            routeCount.textContent = "0";

        if (budgetTotal)
            budgetTotal.textContent = "0 €";

        if (durationTotal)
            durationTotal.textContent = "0 j";

        return;
    }


    stopCount.textContent =
        trip.stops.length;


    routeCount.textContent =
        trip.routes.length;


    let total = 0;


    trip.stops.forEach(stop => {
        total += Number(stop.price) || 0;
    });


    trip.routes.forEach(route => {
        total += Number(route.price) || 0;
    });


    budgetTotal.textContent =
        formatPrice(total);


    durationTotal.textContent =
        calculateDuration(trip);
}


function calculateDuration(trip) {

    const dates =
        trip.stops
            .map(stop => stop.date)
            .filter(Boolean)
            .sort();


    if (dates.length < 2) {
        return "0 j";
    }


    const first =
        new Date(dates[0]);


    const last =
        new Date(
            dates[dates.length - 1]
        );


    const days =
        Math.round(
            (
                last - first
            ) /
            86400000
        ) + 1;


    return `${days} j`;
}


/* =========================================================
   MISE À JOUR
========================================================= */

function updateUI() {

    renderStops();

    renderRoutes();

    renderTrips();

    updateStats();

    refreshMap();
}


/* =========================================================
   UTILITAIRES
========================================================= */

function emptyCard(title, text) {

    return `
        <div class="item-card">

            <h3>
                ${escapeHTML(title)}
            </h3>

            <p>
                ${escapeHTML(text)}
            </p>

        </div>
    `;
}


function formatPrice(value) {

    return (
        Number(value).toLocaleString(
            "fr-FR",
            {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2
            }
        ) + " €"
    );
}


function formatDate(value) {

    const date =
        new Date(value);


    if (Number.isNaN(date.getTime())) {
        return value;
    }


    return date.toLocaleDateString(
        "fr-FR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );
}


function formatStopType(type) {

    const types = {

        hotel: "Hôtel",

        restaurant: "Restaurant",

        museum: "Musée",

        beach: "Plage",

        home: "Maison",

        visit: "Visite"
    };


    return types[type] || "Visite";
}


function escapeHTML(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   SUPPRESSION DONNÉES
========================================================= */

function clearAllData() {

    const confirmed =
        confirm(
            "Voulez-vous vraiment supprimer toutes vos données TripFlow ?"
        );


    if (!confirmed) return;


    localStorage.removeItem(
        STORAGE_KEY
    );


    state = {
        trips: [],
        currentTripId: null
    };


    updateUI();

    showPage("home");
}