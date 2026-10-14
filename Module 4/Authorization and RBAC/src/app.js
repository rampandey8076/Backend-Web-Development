require('dotenv').config();

const express = require('express');
const jwt = require('jsonwebtoken');

const requireAuth = require('./middleware/requireAuth');
const requireRole = require('./middleware/requireRole');
const postsRouter = require('./routes/posts');
const { users } = require('./data');

const app = express();
const ACCESS_SECRET =
  process.env.ACCESS_SECRET || 'kalvium-rbac-test-secret';

app.use(express.json());

// Public test login route.
// Production applications must authenticate real credentials.
app.post('/auth/login', (req, res) => {
  const { id, role } = req.body || {};
  const validRoles = ['member', 'moderator', 'admin'];

  if (
    typeof id !== 'string' ||
    !id ||
    !validRoles.includes(role)
  ) {
    return res.status(400).json({
      error: {
        code: 'INVALID_INPUT',
        message: 'Provide an id and a valid role.'
      }
    });
  }

  const accessToken = jwt.sign(
    { sub: id, role },
    ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  return res.status(200).json({ accessToken });
});

// Admin-only route: authentication first, authorization second.
app.delete(
  '/users/:id',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    if (!users.has(req.params.id)) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'User not found.'
        }
      });
    }

    users.delete(req.params.id);

    return res.status(200).json({
      message: 'User deleted successfully.'
    });
  }
);

app.use('/posts', postsRouter);

app.get('/', (req, res) => {
  res.json({ message: 'Authorization and RBAC API is running.' });
});

module.exports = app;
