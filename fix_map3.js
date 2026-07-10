const fs = require('fs');
let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

// 1. Update updateMap logic for multiple locations
const targetUpdateMap = `const geoSchemes = schemesToRender.filter(s => s.lat && s.lng);
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
    const marker = L.marker([s.lat, s.lng], { icon: customIcon });
    marker.bindPopup("<h4>" + s.name + "</h4><p><strong>" + s.departmentName + ":</strong> " + (s.outlay || 'N/A') + "</p><p>Location: " + s.locationName + "</p>");
    markerClusterGroup.addLayer(marker);
    mapMarkers.push(marker);
  });`;

const replaceUpdateMap = `const geoSchemes = schemesToRender.filter(s => s.locations && s.locations.length > 0);
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
  });`;

if (js.includes(targetUpdateMap)) {
    js = js.replace(targetUpdateMap, replaceUpdateMap);
} else {
    console.log("Could not find targetUpdateMap block");
}

// 2. Fix the bug where map is not updated on filter/search clear.
// Find the end of renderContent
const targetRenderContentEnd = `    const resultsCountNum = document.getElementById('results-count-num');
    if (resultsCountNum) {
        resultsCountNum.textContent = schemeCount;
    }
  
    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
}`;

const replaceRenderContentEnd = `    const resultsCountNum = document.getElementById('results-count-num');
    if (resultsCountNum) {
        resultsCountNum.textContent = schemeCount;
    }
  
    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
    
    // Fix: Update the map to reflect the newly filtered active schemes
    updateMap(activeSchemes);
}`;

if (js.includes(targetRenderContentEnd)) {
    js = js.replace(targetRenderContentEnd, replaceRenderContentEnd);
} else {
    console.log("Could not find targetRenderContentEnd block");
}

fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
console.log('main.js modified');
