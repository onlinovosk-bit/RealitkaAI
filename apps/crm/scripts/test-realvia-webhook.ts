// ================================================================
// Revolis.AI — Local Realvia Webhook Test Script
// Usage: npx ts-node scripts/test-realvia-webhook.ts
//
// Sends simulated Realvia payloads to local webhook endpoint.
// Run your dev server first: npm run dev
// ================================================================

const BASE_URL = process.env.TEST_URL ?? 'http://localhost:3000';
const ENDPOINT = `${BASE_URL}/api/webhooks/realvia`;

// Use your local env values (or leave empty for dev mode)
const IDENTIFIER = process.env.REALVIA_IDENTIFIER ?? 'revolis-live-webhook';
const IDENTIFIER_2 = process.env.REALVIA_IDENTIFIER_2 ?? 'rv_7F29xA91mK44pQ';

// ── Test Payloads ────────────────────────────────────────────────

const ADVERT_CREATE_PAYLOAD = {
  office: [],
  broker: {
    source_id: 1,
    first_name: 'Ján',
    last_name: 'Novák',
    degree_before: 'Ing.',
    degree_after: null,
    deleted: false,
    phone: '+421911222333',
    email: 'jan.novak@realitysmolko.sk',
  },
  advert: {
    source_id: 1004,
    category: 12,
    geo_point: {
      lat: 48.425033951581,
      lon: 18.846366368464,
    },
    transaction: 123,
    title: '3-izbový byt na Šturovovej ulici, Poprad',
    description: 'Krásny slnečný byt s balkónom a výhľadom na Tatry. Po kompletnej rekonštrukcii.',
    real_estate_state: 136,
    units: 149,
    price_by_agreement: 0,
    price: 185000,
    currency: 167,
    power_costs: 120,
    usable_area: 72.5,
    building_area: 85,
    land_area: 0,
    availability: 30822,
    building_energy_rating_certificate: 305,
    number_of_overhead_floors: 8,
    floor: 3,
    rooms_count: 3,
    ownership: 344,
    building_type: [418],
    estate_equipment: [533, 534, 535],
    heating_system: [723],
    utility_lines: [686, 688],
    communication_and_data_line: [735],
    location: {
      state_id: 1,
      county_id: 6,
      district_id: 602,
      region_id: 517283,
      citypart_id: 1,
      street_id: 0,
    },
    street: 'Šturovova',
    show_street: 1,
    images: [
      {
        url: 'https://www.example.com/imgcache/photo1.jpg',
      },
      {
        url: 'https://www.example.com/imgcache/photo2.jpg',
      },
      {
        url: 'https://www.example.com/imgcache/podorys.png',
        tags: ['podorys'],
      },
    ],
    extra: {
      balcony_area: 8.5,
      loggia_area: 0,
      terrace_area: 0,
      cellar_area: 3,
      garage_area: 0,
      garden_area: 0,
      parking_count: 1,
      bathroom_count: 1,
      wc_count: 1,
    },
  },
};

const ADVERT_UPDATE_PAYLOAD = {
  ...ADVERT_CREATE_PAYLOAD,
  advert: {
    ...ADVERT_CREATE_PAYLOAD.advert,
    price: 179000, // Price drop!
    title: '3-izbový byt na Šturovovej ulici, Poprad — ZNÍŽENÁ CENA',
  },
};

const DELETE_PAYLOAD = {
  source_id: 1004,
  deleted: true as const,
};

// ── Test Runner ──────────────────────────────────────────────────

async function sendPayload(
  name: string,
  payload: unknown,
  expectStatus = 200,
): Promise<void> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log(`${'─'.repeat(60)}`);

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'identifikator': IDENTIFIER,
        'identifikator2': IDENTIFIER_2,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    const passed = res.status === expectStatus;

    console.log(`Status: ${res.status} ${passed ? '✅' : '❌'} (expected ${expectStatus})`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (!passed) {
      console.log('❌ FAILED');
    }
  } catch (err) {
    console.log(`❌ ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
  }
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  REALVIA WEBHOOK LOCAL TEST SUITE');
  console.log(`  Endpoint: ${ENDPOINT}`);
  console.log('═══════════════════════════════════════════════════');

  // Test 1: Health check
  console.log('\n── Health Check ──');
  try {
    const res = await fetch(ENDPOINT);
    const data = await res.json();
    console.log(`GET ${ENDPOINT} → ${res.status}`, data);
  } catch (err) {
    console.log(`GET failed: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Test 2: Create advert
  await sendPayload('CREATE ADVERT (source_id=1004)', ADVERT_CREATE_PAYLOAD);

  // Test 3: Update advert (price change)
  await sendPayload('UPDATE ADVERT — PRICE DROP (1004: 185000→179000)', ADVERT_UPDATE_PAYLOAD);

  // Test 4: Duplicate (idempotency test)
  await sendPayload('DUPLICATE — SAME PAYLOAD AGAIN (idempotency)', ADVERT_UPDATE_PAYLOAD);

  // Test 5: Delete advert
  await sendPayload('DELETE ADVERT (source_id=1004)', DELETE_PAYLOAD);

  // Test 6: Invalid payload
  await sendPayload('INVALID PAYLOAD (should still store)', { foo: 'bar' });

  // Test 7: No auth (should fail with 403 in production)
  console.log(`\n${'─'.repeat(60)}`);
  console.log('TEST: NO AUTH HEADERS');
  console.log(`${'─'.repeat(60)}`);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ADVERT_CREATE_PAYLOAD),
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`, data);
  } catch (err) {
    console.log(`ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  // Test 8: Trigger queue processing
  console.log(`\n${'─'.repeat(60)}`);
  console.log('TEST: TRIGGER QUEUE PROCESSING');
  console.log(`${'─'.repeat(60)}`);
  try {
    const res = await fetch(`${BASE_URL}/api/cron/realvia-process`);
    const data = await res.json();
    console.log(`Status: ${res.status}`, JSON.stringify(data, null, 2));
  } catch (err) {
    console.log(`ERROR: ${err instanceof Error ? err.message : 'Unknown'}`);
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('  TEST SUITE COMPLETE');
  console.log('═══════════════════════════════════════════════════');
}

runTests().catch(console.error);
