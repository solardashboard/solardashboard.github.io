# SolarDashboard

Outil de prospection solaire à usage interne. Permet de visualiser des prospects
sur carte à partir d'un fichier GeoJSON, d'accéder aux fiches détaillées (potentiel
solaire, toiture, contact), et d'exporter une sélection en CSV.

## Stack

- HTML / CSS / JS vanilla — aucune dépendance de build
- [Leaflet](https://leafletjs.com/) + [MarkerCluster](https://github.com/Leaflet/Leaflet.markercluster)
- Fond de carte : CartoDB Light
- Orthophotographies : [Géoplateforme IGN](https://geoservices.ign.fr/) (BDORTHO)
- Hébergement : GitHub Pages

## Structure
```
solardashboard.github.io/
├── index.html              ← Landing page
├── legal.html              ← Mentions légales
└── prospection/
    ├── index.html          ← Interface principale
    ├── app.css
    └── js/
        ├── config.js       ← Constantes
        ├── state.js        ← État partagé
        ├── map.js          ← Carte et markers
        ├── ui.js           ← Sidebar et filtres
        ├── detail.js       ← Fiche prospect
        ├── lightbox.js     ← Vue aérienne
        ├── data.js         ← Parsing GeoJSON
        ├── export.js       ← Export CSV
        └── main.js         ← Init et drag & drop
```

## Licence et propriété intellectuelle

Copyright © 2026 Gabriel Kasmi — SIREN 998 924 062

L'ensemble du code source, des interfaces et des contenus de ce dépôt est la
propriété exclusive de Gabriel Kasmi et est protégé par le Code de la propriété
intellectuelle français (CPI).

**Toute reproduction, modification, distribution ou utilisation commerciale est
strictement interdite sans autorisation écrite préalable.**

Les ressources tierces sont utilisées conformément à leurs licences respectives :

| Ressource | Licence |
|---|---|
| Leaflet | BSD-2-Clause |
| Leaflet.markercluster | MIT |
| OpenStreetMap / CartoDB | ODbL |
| IGN BDORTHO | Licence Ouverte Etalab v2.0 |

## Contact

gabriel.kasmi.services@gmail.com
