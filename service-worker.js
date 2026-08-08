const CACHE_NAME = "tripflow-v1.0.0";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


/* =====================================================
   INSTALLATION
===================================================== */

self.addEventListener("install", event => {

    event.waitUntil(

        caches.open(CACHE_NAME)
            .then(cache => {

                return cache.addAll(APP_FILES);

            })

    );

    self.skipWaiting();

});


/* =====================================================
   ACTIVATION
===================================================== */

self.addEventListener("activate", event => {

    event.waitUntil(

        caches.keys()
            .then(cacheNames => {

                return Promise.all(

                    cacheNames
                        .filter(
                            name =>
                                name !== CACHE_NAME
                        )
                        .map(
                            name =>
                                caches.delete(name)
                        )

                );

            })

    );

    self.clients.claim();

});


/* =====================================================
   REQUÊTES
===================================================== */

self.addEventListener("fetch", event => {

    const request =
        event.request;


    /*
       Pour les pages de l'application :
       cache d'abord, puis réseau.
    */

    if (
        request.method !== "GET"
    ) {
        return;
    }


    event.respondWith(

        caches.match(request)
            .then(cachedResponse => {

                if (cachedResponse) {

                    return cachedResponse;

                }


                return fetch(request)
                    .then(response => {

                        /*
                           On ne met en cache que les
                           réponses valides.
                        */

                        if (
                            !response ||
                            response.status !== 200 ||
                            response.type === "opaque"
                        ) {

                            return response;

                        }


                        const responseClone =
                            response.clone();


                        caches.open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    responseClone
                                );

                            });


                        return response;

                    })
                    .catch(() => {

                        /*
                           Si Internet est indisponible,
                           on tente de retourner index.html.
                        */

                        return caches.match(
                            "./index.html"
                        );

                    });

            })

    );

});