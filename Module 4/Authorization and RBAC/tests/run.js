const assert = require('node:assert/strict');
const request = require('supertest');

const app = require('../src/app');
const { resetData } = require('../src/data');


const jwt = require('jsonwebtoken');

async function token(id, role) {
  const response = await request(app)
    .post('/auth/login')
    .send({ id, role });

  assert.equal(response.status, 200);
  assert.ok(response.body.accessToken);

  return response.body.accessToken;
}

function auth(accessToken) {
  return { Authorization: `Bearer ${accessToken}` };
}

const tests = [
  {
    name: '1. Owner can edit their own post',
    run: async () => {
      resetData();
      const t = await token('u-A', 'member');

      const res = await request(app)
        .patch('/posts/1')
        .set(auth(t))
        .send({ title: 'Updated by owner' });

      assert.equal(res.status, 200);
      assert.equal(res.body.post.title, 'Updated by owner');
    }
  },
  {
    name: '2. Member cannot edit another member post (IDOR closed)',
    run: async () => {
      resetData();
      const t = await token('u-B', 'member');

      const res = await request(app)
        .patch('/posts/1')
        .set(auth(t))
        .send({ title: 'Unauthorized edit' });

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    }
  },
  {
    name: '3. Owner can delete their own post',
    run: async () => {
      resetData();
      const t = await token('u-A', 'member');

      const res = await request(app)
        .delete('/posts/1')
        .set(auth(t));

      assert.equal(res.status, 200);
    }
  },
  {
    name: '4. Member cannot delete another member post',
    run: async () => {
      resetData();
      const t = await token('u-B', 'member');

      const res = await request(app)
        .delete('/posts/1')
        .set(auth(t));

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    }
  },
  {
    name: '5. Moderator can delete any post',
    run: async () => {
      resetData();
      const t = await token('u-M', 'moderator');

      const res = await request(app)
        .delete('/posts/1')
        .set(auth(t));

      assert.equal(res.status, 200);
    }
  },
  {
    name: '6. Member cannot hide a post',
    run: async () => {
      resetData();
      const t = await token('u-A', 'member');

      const res = await request(app)
        .post('/posts/1/hide')
        .set(auth(t));

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    }
  },
  {
    name: '7. Moderator can hide a post',
    run: async () => {
      resetData();
      const t = await token('u-M', 'moderator');

      const res = await request(app)
        .post('/posts/1/hide')
        .set(auth(t));

      assert.equal(res.status, 200);
      assert.equal(res.body.post.hidden, true);
    }
  },
  {
    name: '8. Member cannot delete a user',
    run: async () => {
      resetData();
      const t = await token('u-A', 'member');

      const res = await request(app)
        .delete('/users/u-B')
        .set(auth(t));

      assert.equal(res.status, 403);
      assert.equal(res.body.error.code, 'FORBIDDEN');
    }
  },
  {
    name: '9. Admin can delete a user',
    run: async () => {
      resetData();
      const t = await token('u-ADMIN', 'admin');

      const res = await request(app)
        .delete('/users/u-B')
        .set(auth(t));

      assert.equal(res.status, 200);
    }
  },
  {
    name: '10. Missing post returns 404 before ownership check',
    run: async () => {
      resetData();
      const t = await token('u-A', 'member');

      const res = await request(app)
        .patch('/posts/999')
        .set(auth(t))
        .send({ title: 'Missing post' });

      assert.equal(res.status, 404);
      assert.equal(res.body.error.code, 'NOT_FOUND');
    }
  },
  {
    name: '11. Missing token returns 401',
    run: async () => {
      resetData();

      const res = await request(app)
        .patch('/posts/1')
        .send({ title: 'No token' });

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHENTICATED');
    }
  },
  {
    name: '12. Invalid token returns 401',
    run: async () => {
      resetData();

      const res = await request(app)
        .delete('/posts/1')
        .set(auth('invalid.token.value'));

      assert.equal(res.status, 401);
      assert.equal(res.body.error.code, 'UNAUTHENTICATED');
    }
  }
];

async function main() {
  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      await test.run();
      passed++;
      console.log(`PASS ${test.name}`);
    } catch (error) {
      failed++;
      console.error(`FAIL ${test.name}`);
      console.error(error.stack || error.message);
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
