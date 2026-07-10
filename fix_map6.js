const fs = require('fs');
let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

// 1. Replace updateMap
const startTargetUpdate = "function updateMap(schemesToRender) {";
const endTargetUpdate = "    });\n  }"; // This might match multiple things, let's use indexOf and manual slice.

let idx1 = js.indexOf(startTargetUpdate);
if (idx1 !== -1) {
    let sub = js.substring(idx1);
    // Find the end of the updateMap function. It ends with:
    // mapMarkers.push(marker);
    // });
    // }
    let endStr = "mapMarkers.push(marker);\n    });\n  }";
    let idx2 = sub.indexOf(endStr);
    if (idx2 !== -1) {
        let fullTarget = sub.substring(0, idx2 + endStr.length);
        
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
        js = js.replace(fullTarget, replacementUpdateMap);
        console.log("Successfully replaced updateMap.");
    } else {
        console.log("Failed to find end of updateMap.");
    }
} else {
    console.log("Failed to find start of updateMap.");
}

// 2. Add updateMap(activeSchemes) to the end of renderContent
const endRenderContentTarget = `    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
}`;

const endRenderContentReplace = `    // After adding dynamic content, tell the animation observer to watch them
    document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });
    
    // Fix: Update the map to reflect the newly filtered active schemes
    updateMap(activeSchemes);
}`;

if (js.includes(endRenderContentTarget)) {
    js = js.replace(endRenderContentTarget, endRenderContentReplace);
    console.log("Successfully fixed renderContent filter map update bug.");
} else {
    console.log("Failed to find renderContent end.");
}

fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
