const fs = require('fs');
let js = fs.readFileSync('budget-frontend/main.js', 'utf8');

// Replace the marker binding logic to use s.outlay instead of s.allocation_crore, and create a divIcon with an emoji
const target = "marker.bindPopup(\"<h4>\" + s.name + \"</h4><p><strong>\" + s.departmentName + \":</strong> \" + (s.allocation_crore ? '₹' + s.allocation_crore + ' Cr' : 'N/A') + \"</p><p>Location: \" + s.locationName + \"</p>\");";

const replacement = `const emoji = getSchemeEmoji(s.name, s.details);
    const customIcon = L.divIcon({
      html: \`<div style="font-size: 24px; text-align: center; line-height: 1.2; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));">\${emoji}</div>\`,
      className: 'custom-emoji-marker',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -15]
    });
    marker.setIcon(customIcon);
    marker.bindPopup("<h4>" + s.name + "</h4><p><strong>" + s.departmentName + ":</strong> " + (s.outlay || 'N/A') + "</p><p>Location: " + s.locationName + "</p>");`;

if (js.includes(target)) {
  js = js.replace(target, replacement);
  fs.writeFileSync('budget-frontend/main.js', js, 'utf8');
  console.log('main.js updated with thematic icons and fixed tooltips.');
} else {
  console.log('Could not find the target string in main.js');
}
