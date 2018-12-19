# BadmInTown

This repo contains the source code for the website [BadmInTown](https://lmgarret.github.io/BadmInTown/).

### Run
To see it in action, go to [BadmInTown](https://lmgarret.github.io/BadmInTown/) or clone this repo and open `index.html` in your web browser. Currently, Firefox and Chrome are supported, support for other web browsers is not tested.

### Folder structure
`data` contains the csv fetched from [Badiste](http://badiste.fr). It also contains the jupyter notebook code written to fetch those.

`geojson` contains various geojson maps of France used thoughout the project.

`img` contains image resources used for the UI.

`sidebar-v2` contains a modified version of [sidebar-v2](https://github.com/nickpeihl/leaflet-sidebar-v2) for [Leaflet](http://leafletjs.com/) to suit our needs.

`svg` contains svg resources used for the UI.

### Sources
 - [Leaflet.js](http://leafletjs.com/) for the displaying the map
 - [sidebar-v2](https://github.com/nickpeihl/leaflet-sidebar-v2) for the sidebar element
 - [Badiste](http://badiste.fr) for the datasets about badminton players and clubs
 - [france-json](https://github.com/gregoiredavid/france-geojson) for the geojson maps of France used
