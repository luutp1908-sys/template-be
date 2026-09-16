import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
const timeoutMs = Number(__ENV.HTTP_TIMEOUT_MS || 15000);

const categoryPayload = () => {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${__VU}-${__ITER}`;
  return JSON.stringify({
    name: `bench-category-${stamp}`,
    slug: `bench-category-${stamp}`,
    editorTypeId: 1,
    parentId: null,
  });
};

export const options = {
  discardResponseBodies: false,
  scenarios: {
    warmup: {
      executor: 'constant-arrival-rate',
      rate: 5,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 10,
      maxVUs: 30,
      gracefulStop: '30s',
    },
    steady_state: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 80,
      startTime: '30s',
      gracefulStop: '30s',
    },
    burst: {
      executor: 'constant-arrival-rate',
      rate: 50,
      timeUnit: '1s',
      duration: '30s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      startTime: '2m30s',
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{scenario:warmup}': ['p(95)<500'],
    'http_req_duration{scenario:steady_state}': ['p(95)<500'],
    'http_req_duration{scenario:burst}': ['p(95)<1000'],
  },
};

function makeGetRequest() {
  const res = http.get(`${baseUrl}/category`, { timeout: timeoutMs });

  check(res, {
    'GET /category status is 200': (r) => r.status === 200,
    'GET /category no 5xx': (r) => r.status < 500,
  });

  return res;
}

function makeWriteRequest() {
  const res = http.post(`${baseUrl}/category`, categoryPayload(), {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: timeoutMs,
  });

  check(res, {
    'POST /category status is 200 or 201': (r) => r.status === 200 || r.status === 201,
    'POST /category no 5xx': (r) => r.status < 500,
  });

  return res;
}

export default function () {
  const routeRoll = Math.random();

  if (routeRoll < 0.7) {
    makeGetRequest();
  } else {
    makeWriteRequest();
  }

  sleep(0.2);
}