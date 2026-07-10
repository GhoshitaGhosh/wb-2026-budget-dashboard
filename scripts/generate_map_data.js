const fs = require('fs');

const data = JSON.parse(fs.readFileSync('../budget-frontend/public/data.json', 'utf8'));

// Coordinates for major West Bengal districts, cities, and special economic zones
const geoDictionary = [
  { keywords: ['Kolkata', 'Calcutta'], lat: 22.5726, lng: 88.3639, name: 'Kolkata' },
  { keywords: ['Howrah'], lat: 22.5958, lng: 88.2636, name: 'Howrah' },
  { keywords: ['Darjeeling'], lat: 27.0410, lng: 88.2663, name: 'Darjeeling' },
  { keywords: ['Siliguri'], lat: 26.7271, lng: 88.3953, name: 'Siliguri' },
  { keywords: ['Asansol'], lat: 23.6739, lng: 86.9524, name: 'Asansol' },
  { keywords: ['Durgapur'], lat: 23.5204, lng: 87.3119, name: 'Durgapur' },
  { keywords: ['Malda'], lat: 25.0108, lng: 88.1411, name: 'Malda' },
  { keywords: ['Kharagpur'], lat: 22.3302, lng: 87.3237, name: 'Kharagpur' },
  { keywords: ['Haldia'], lat: 22.0624, lng: 88.0715, name: 'Haldia' },
  { keywords: ['Jalpaiguri'], lat: 26.5404, lng: 88.7193, name: 'Jalpaiguri' },
  { keywords: ['Alipurduar'], lat: 26.4918, lng: 89.5271, name: 'Alipurduar' },
  { keywords: ['Cooch Behar', 'Coochbehar'], lat: 26.3236, lng: 89.4484, name: 'Cooch Behar' },
  { keywords: ['Kalimpong'], lat: 27.0594, lng: 88.4695, name: 'Kalimpong' },
  { keywords: ['Dakshin Dinajpur', 'South Dinajpur'], lat: 25.2897, lng: 88.7554, name: 'Dakshin Dinajpur' },
  { keywords: ['Uttar Dinajpur', 'North Dinajpur', 'Raiganj'], lat: 25.6186, lng: 88.1256, name: 'Uttar Dinajpur' },
  { keywords: ['Purulia'], lat: 23.3321, lng: 86.3616, name: 'Purulia' },
  { keywords: ['Bankura'], lat: 23.2324, lng: 87.0784, name: 'Bankura' },
  { keywords: ['Medinipur', 'Midnapore'], lat: 22.4257, lng: 87.3211, name: 'Medinipur' },
  { keywords: ['Bardhaman', 'Burdwan', 'Paschim Bardhaman', 'Purba Bardhaman'], lat: 23.2324, lng: 87.8615, name: 'Bardhaman' },
  { keywords: ['Kalyani'], lat: 22.9751, lng: 88.4345, name: 'Kalyani' },
  { keywords: ['Hooghly'], lat: 22.9010, lng: 88.3965, name: 'Hooghly' },
  { keywords: ['Murshidabad'], lat: 24.1759, lng: 88.2802, name: 'Murshidabad' },
  { keywords: ['Nadia'], lat: 23.4710, lng: 88.5565, name: 'Nadia' },
  { keywords: ['Birbhum'], lat: 23.9102, lng: 87.5277, name: 'Birbhum' },
  { keywords: ['South 24 Parganas'], lat: 22.1332, lng: 88.4029, name: 'South 24 Parganas' },
  { keywords: ['North 24 Parganas'], lat: 22.6168, lng: 88.4029, name: 'North 24 Parganas' },
  { keywords: ['Sundarban', 'Sundarbans'], lat: 21.9497, lng: 89.1833, name: 'Sundarbans' },
  { keywords: ['Tajpur'], lat: 21.6441, lng: 87.6253, name: 'Tajpur Deep Sea Port' },
  { keywords: ['Deocha', 'Pachami'], lat: 24.0189, lng: 87.5857, name: 'Deocha Pachami Coal Block' },
  { keywords: ['Kolaghat'], lat: 22.4344, lng: 87.8732, name: 'Kolaghat' },
  { keywords: ['Jhargram'], lat: 22.4519, lng: 86.9944, name: 'Jhargram' },
  { keywords: ['Purba Medinipur'], lat: 22.0232, lng: 87.7347, name: 'Purba Medinipur' },
  { keywords: ['Paschim Medinipur'], lat: 22.4257, lng: 87.3211, name: 'Paschim Medinipur' },
  { keywords: ['Bishnupur'], lat: 23.0782, lng: 87.3196, name: 'Bishnupur' },
  { keywords: ['Bolpur', 'Shantiniketan'], lat: 23.6669, lng: 87.6974, name: 'Bolpur' },
  { keywords: ['Andal'], lat: 23.5856, lng: 87.1856, name: 'Andal' },
  { keywords: ['Balurghat'], lat: 25.2269, lng: 88.7612, name: 'Balurghat' },
  { keywords: ['Sagar', 'Sagar Island'], lat: 21.7333, lng: 88.1167, name: 'Sagar Island' },
  { keywords: ['Barjora'], lat: 23.4334, lng: 87.2884, name: 'Barjora' },
  { keywords: ['Salgara'], lat: 26.71, lng: 88.43, name: 'Salgara' }, // Near Siliguri roughly
  { keywords: ['Raghunathpur'], lat: 23.5484, lng: 86.6710, name: 'Raghunathpur' },
  { keywords: ['Panagarh'], lat: 23.4542, lng: 87.4326, name: 'Panagarh' },
  { keywords: ['Gour', 'Pandua'], lat: 24.8872, lng: 88.1388, name: 'Gour/Pandua' },
  { keywords: ['Chandraketugarh'], lat: 22.6844, lng: 88.6705, name: 'Chandraketugarh' },
  { keywords: ['Bantala'], lat: 22.5293, lng: 88.4839, name: 'Bantala' }
];

let manualGeo = {};
try {
  manualGeo = JSON.parse(fs.readFileSync('manual_geo.json', 'utf8'));
} catch (e) {
  console.log("No manual_geo.json found or invalid, proceeding with automatic only.");
}

let appliedSchemes = 0;
let totalLocationsMappped = 0;

data.departments.forEach(dept => {
  dept.schemes.forEach(scheme => {
    // clean up old single-location properties if any
    delete scheme.lat;
    delete scheme.lng;
    delete scheme.locationName;
    
    scheme.locations = [];
    const text = (scheme.name + ' ' + scheme.details).toLowerCase();
    
    // Check manual override first
    if (manualGeo[scheme.name]) {
        // Use exact manual coordinates
        manualGeo[scheme.name].forEach(loc => {
            scheme.locations.push({
                lat: loc.lat, // precise, no random jitter
                lng: loc.lng,
                name: loc.name
            });
            totalLocationsMappped++;
        });
    } else {
        // Fallback to Find ALL matching locations via generic keywords
        for (const geo of geoDictionary) {
          // Check if keyword is found as a distinct word (using regex bounds) to avoid substring matching like "pur"
          if (geo.keywords.some(kw => new RegExp('\\b' + kw.toLowerCase() + '\\b', 'i').test(text))) {
            // Only add if not already added to avoid duplicate names in the locations array
            if (!scheme.locations.find(l => l.name === geo.name)) {
                scheme.locations.push({
                    lat: geo.lat + (Math.random() - 0.5) * 0.05,
                    lng: geo.lng + (Math.random() - 0.5) * 0.05,
                    name: geo.name
                });
                totalLocationsMappped++;
            }
          }
        }
    }
    
    if (scheme.locations.length > 0) {
        appliedSchemes++;
    }
  });
});

fs.writeFileSync('../budget-frontend/public/data.json', JSON.stringify(data, null, 2), 'utf8');
console.log(`Successfully mapped ${appliedSchemes} schemes to ${totalLocationsMappped} geographic coordinates.`);
