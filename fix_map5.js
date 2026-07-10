const fs = require('fs');
let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

// 1. Replace updateMap
const updateMapRegex = /function updateMap\(schemesToRender\) \{[\s\S]*?\n  \}/;

const replacementUpdateMap = `function updateMap(schemesToRender) {
    if (!budgetMap) return;
    
    if (markerClusterGroup) {
      budgetMap.removeLayer(markerClusterGroup);
    }
    markerClusterGroup = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 40
    });
    
    mapMarkers = [];
  
    const geoSchemes = schemesToRender.filter(s => s.locations && s.locations.length > 0);
    if (geoSchemes.length === 0) return;
  
    geoSchemes.forEach(s => {
      const emoji = getSchemeEmoji(s.name, s.details);
      const customIcon = L.divIcon({
        html: \`<div style="font-size: 24px; text-align: center; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\${emoji}</div>\`,
        className: 'custom-emoji-marker',
        iconSize: [30, 30],
        iconAnchor: [15, 15],
        popupAnchor: [0, -15]
      });
      
      s.locations.forEach(loc => {
        const marker = L.marker([loc.lat, loc.lng], { icon: customIcon });
        marker.bindPopup("<h4>" + s.name + "</h4><p><strong>" + s.departmentName + ":</strong> " + (s.outlay || 'N/A') + "</p><p>Location: " + loc.name + "</p>");
        markerClusterGroup.addLayer(marker);
        mapMarkers.push(marker);
      });
    });
    
    budgetMap.addLayer(markerClusterGroup);
  }`;

js = js.replace(updateMapRegex, replacementUpdateMap);

// 2. Fix the missing map update at end of renderContent
const renderContentRegex = /(animationObserver\.observe\(el\);\s*\});\s*\}/;
js = js.replace(renderContentRegex, "$1\n    updateMap(activeSchemes);\n}");

fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
console.log('main.js modified using regex.');
