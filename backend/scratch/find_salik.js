const https = require('https');

// Extract project ref from DB URL
const SUPABASE_URL = 'https://dazynjzfpkndzvzuhoim.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// Use REST API to query users
const options = {
  hostname: 'dazynjzfpkndzvzuhoim.supabase.co',
  path: '/rest/v1/User?or=(name.ilike.*salik*,name.ilike.*saliq*,email.ilike.*salik*,email.ilike.*saliq*)&select=id,name,email,status',
  method: 'GET',
  headers: {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log(JSON.parse(data));
  });
});
req.on('error', e => console.error(e));
req.end();
