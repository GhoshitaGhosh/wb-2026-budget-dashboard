const fs = require('fs');
let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

const target1 = `function updateMap(schemesToRender) {
  if (!budgetMap) return;
  mapMarkers.forEach(marker => budgetMap.removeLayer(marker));
  mapMarkers = [];

  const geoSchemes = schemesToRender.filter(s => s.lat && s.lng);
  if (geoSchemes.length === 0) return;

  geoSchemes.forEach(s => {
    const marker = L.marker([s.lat, s.lng]).addTo(budgetMap);
    const emoji = getSchemeEmoji(s.name, s.details);
    const customIcon = L.divIcon({
      html: \`<div style="font-size: 24px; text-align: center; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\${emoji}</div>\`,
      className: 'custom-emoji-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
    marker.setIcon(customIcon);
    marker.bindPopup("<h4>" + s.name + "</h4><p><strong>" + s.departmentName + ":</strong> " + (s.outlay || 'N/A') + "</p><p>Location: " + s.locationName + "</p>");
    mapMarkers.push(marker);
  });
}`;

const replace1 = `function updateMap(schemesToRender) {
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

if (js.includes(target1)) {
    js = js.replace(target1, replace1);
    console.log('updateMap replaced successfully.');
} else {
    console.log('Failed to find updateMap!');
}

const target2 = `    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
}`;

const replace2 = `    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
    
    // Fix: Update the map to reflect the newly filtered active schemes
    updateMap(activeSchemes);
}`;

if (js.includes(target2)) {
    js = js.replace(target2, replace2);
    console.log('renderContent filter fix added successfully.');
} else {
    console.log('Failed to find renderContent filter fix location!');
}

fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
