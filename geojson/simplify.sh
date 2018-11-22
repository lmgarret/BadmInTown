mapshaper -i france_departements_all.geojson snap -proj wgs84 -simplify 20% weighted keep-shapes -o format=geojson precision=0.001 france_departements_all_low.geojson
