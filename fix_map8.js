const fs = require('fs');
let lines = fs.readFileSync('budget-frontend/main.js', 'utf8').split('\n');

let insideUpdateMap = false;
let updateMapStartIndex = -1;
let updateMapEndIndex = -1;

for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('function updateMap(schemesToRender) {')) {
        updateMapStartIndex = i;
        insideUpdateMap = true;
    } else if (insideUpdateMap && lines[i] === '}') {
        updateMapEndIndex = i;
        insideUpdateMap = false;
    }
}

if (updateMapStartIndex !== -1 && updateMapEndIndex !== -1) {
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
      html: \\\`<div style="font-size: 24px; text-align: center; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\\\${emoji}</div>\\\`,
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
}`.split('\n');

    lines.splice(updateMapStartIndex, updateMapEndIndex - updateMapStartIndex + 1, ...replacementUpdateMap);
    console.log('Replaced updateMap array logic.');
}

// Find renderContent end
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('animationObserver.observe(el);') && lines[i+1] && lines[i+1].includes('});') && lines[i+2] && lines[i+2].trim() === '}') {
        lines.splice(i+2, 0, '    updateMap(activeSchemes);');
        console.log('Fixed renderContent filter map update.');
        break;
    }
}

fs.writeFileSync('budget-frontend/main.js', lines.join('\n'), 'utf8');
