import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const host = process.argv[2] || 'http://localhost:3000';
const cookie = process.argv[3] || '';

const payload = {
  name: 'Smoke Test Lead',
  email: 'smoke@example.com',
  phone: '+421900000000',
  location: 'Bratislava',
  budget: '500000',
  propertyType: 'Byt',
  rooms: '2 izby',
  financing: 'Hypotéka',
  timeline: 'Do 3 mesiacov',
  source: 'Smoke test',
  status: 'Nový',
  score: 60,
  assignedAgent: 'Smoke Test',
  note: 'Smoke test after tenant-scoped fix',
};

const headers = {
  'Content-Type': 'application/json',
};

if (cookie) {
  headers.Cookie = cookie;
}

const response = await fetch(`${host}/api/leads`, {
  method: 'POST',
  headers,
  body: JSON.stringify(payload),
});

const text = await response.text();
console.log(`Status: ${response.status}`);
console.log(text);
