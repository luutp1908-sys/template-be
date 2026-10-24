import http from 'k6/http';
import { check, sleep } from 'k6';

const baseUrl = __ENV.BASE_URL || 'http://localhost:4000/api/v1';
const authToken = __ENV.AUTH_TOKEN || '';
const pollIntervalMs = Number(__ENV.POLL_INTERVAL_MS || 2000);
const maxPolls = Number(__ENV.MAX_POLLS || 30);
const downloadAfterCompleted = __ENV.DOWNLOAD_AFTER_COMPLETED !== 'false';

const headers = {
  'Content-Type': 'application/json',
  ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
};

function buildExportPayload() {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 12)}-${__VU}-${__ITER}`;

  const payload = {
    format: 'pdf',
    templateName: __ENV.TEMPLATE_NAME || `bench-export-${stamp}`,
    content: {
      pages: [
        {
          id: 'page-1',
          elements: [
            {
              id: 'text-1',
              type: 'text',
              text: `Design export benchmark - ${stamp}`,
            },
          ],
        },
      ],
      meta: {
        title: `Benchmark export ${stamp}`,
        source: 'k6-load-test',
      },
    },
  };

  if (__ENV.WORKSPACE_ID) {
    payload.workspaceId = __ENV.WORKSPACE_ID;
  }

  if (__ENV.TEMPLATE_ID) {
    payload.templateId = __ENV.TEMPLATE_ID;
  }

  if (__ENV.DRAFT_ID) {
    payload.draftId = __ENV.DRAFT_ID;
  }

  return payload;
}

function createExportJob() {
  const res = http.post(`${baseUrl}/export/jobs`, JSON.stringify(buildExportPayload()), {
    headers,
    timeout: '30s',
  });

  check(res, {
    'export job creation returns 200 or 201': (r) => r.status === 200 || r.status === 201,
    'export job creation has no 5xx': (r) => r.status < 500,
  });

  if (res.status !== 200 && res.status !== 201) {
    return null;
  }

  const body = res.json();
  return body?.id || null;
}

function pollExportStatus(jobId) {
  let attempts = 0;

  while (attempts < maxPolls) {
    const res = http.get(`${baseUrl}/export/jobs/${jobId}`, {
      headers,
      timeout: '30s',
    });

    check(res, {
      'export status poll succeeds': (r) => r.status === 200,
      'export status poll has no 5xx': (r) => r.status < 500,
    });

    if (res.status !== 200) {
      return null;
    }

    const job = res.json();

    if (job.status === 'completed') {
      return job;
    }

    if (job.status === 'failed') {
      return job;
    }

    sleep(pollIntervalMs / 1000);
    attempts += 1;
  }

  return null;
}

function downloadExport(jobId, fileName) {
  const res = http.get(`${baseUrl}/export/jobs/${jobId}/download`, {
    headers,
    timeout: '60s',
  });

  check(res, {
    'export download succeeds': (r) => r.status === 200,
    'export download has no 5xx': (r) => r.status < 500,
  });

  return res;
}

export const options = {
  discardResponseBodies: false,
  scenarios: {
    export_flow: {
      executor: 'constant-arrival-rate',
      rate: 1,
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 5,
      maxVUs: 30,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(99)<4000'],
    'http_req_duration{scenario:export_flow}': ['p(95)<2000'],
  },
};

export default function () {
  const jobId = createExportJob();

  if (!jobId) {
    return;
  }

  const job = pollExportStatus(jobId);

  if (job && job.status === 'completed' && downloadAfterCompleted) {
    downloadExport(jobId, job.fileName || `${jobId}.pdf`);
  }

  sleep(0.5);
}

/*
Usage examples:

  BASE_URL=http://localhost:4000/api/v1 \
  AUTH_TOKEN="<jwt>" \
  TEMPLATE_ID="<valid-template-id>" \
  k6 run performance-test/test-export-design.js

Or with a workspace/draft:

  BASE_URL=http://localhost:4000/api/v1 \
  AUTH_TOKEN="<jwt>" \
  WORKSPACE_ID="<valid-workspace-id>" \
  DRAFT_ID="<valid-draft-id>" \
  DOWNLOAD_AFTER_COMPLETED=true \
  k6 run performance-test/test-export-design.js

This script validates the full async export flow:
  1) create export job
  2) poll status until completed or failed
  3) optionally download the completed PDF
*/
