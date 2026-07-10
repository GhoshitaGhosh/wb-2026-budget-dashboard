const fs = require('fs');

let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

// 1. Add MarkerCluster imports
const leafletImport = `import 'leaflet/dist/leaflet.css';`;
const clusterImports = `
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';`;

if (!js.includes('leaflet.markercluster')) {
  js = js.replace(leafletImport, leafletImport + clusterImports);
}

// 2. Add markerClusterGroup variable
if (!js.includes('let markerClusterGroup = null;')) {
  js = js.replace('let budgetMap = null;', 'let budgetMap = null;\nlet markerClusterGroup = null;');
}

// 3. Update initMap logic
const oldInitMap = `budgetMap = L.map('budget-map').setView([22.9868, 87.8550], 7);`;
const newInitMap = `const wbBounds = L.latLngBounds(
      L.latLng(21.0, 85.0), // South-West
      L.latLng(27.5, 90.0)  // North-East
    );
    budgetMap = L.map('budget-map', {
      maxBounds: wbBounds,
      maxBoundsViscosity: 1.0,
      minZoom: 6
    }).setView([23.5, 87.8], 7);`;

js = js.replace(oldInitMap, newInitMap);

// 4. Update updateMap logic
const oldUpdateStart = `mapMarkers.forEach(marker => budgetMap.removeLayer(marker));
    mapMarkers = [];`;
const newUpdateStart = `if (markerClusterGroup) {
      budgetMap.removeLayer(markerClusterGroup);
    }
    markerClusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40
    });
    
    mapMarkers = [];`;

js = js.replace(oldUpdateStart, newUpdateStart);

// 5. Update adding markers to cluster group instead of map
const oldAddToMap = `marker.addTo(budgetMap);
      mapMarkers.push(marker);`;
const newAddToMap = `markerClusterGroup.addLayer(marker);
      mapMarkers.push(marker);`;

js = js.replace(oldAddToMap, newAddToMap);

// 6. Finally, add the cluster group to the map at the end of updateMap
const oldUpdateEnd = `});
  }`;
const newUpdateEnd = `});
    budgetMap.addLayer(markerClusterGroup);
  }`;

// This replace needs to be careful to target the end of updateMap.
// It's safer to just replace the last part of updateMap.
js = js.replace(/    \}\)\;\n  \}/, `    });\n    budgetMap.addLayer(markerClusterGroup);\n  }`);

fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
console.log('Map clustering and bounds added.');
