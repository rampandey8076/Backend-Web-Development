const express = require('express');
const router = express.Router();

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { posts } = require('../data');

const privilegedRoles = ['moderator', 'admin'];

function canModifyPost(post, user) {
  const isOwner = post.authorId === user.id;
  const isPrivileged = privilegedRoles.includes(user.role);

  return isOwner || isPrivileged;
}

// A member may edit their own post.
// Moderators and admins may edit any post.
router.patch('/:id', requireAuth, (req, res) => {
  const post = posts.get(req.params.id);

  // Check existence before ownership.
  if (!post) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found.'
      }
    });
  }

  if (!canModifyPost(post, req.user)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You cannot edit a post owned by another user.'
      }
    });
  }

  if (typeof req.body.title === 'string') {
    post.title = req.body.title;
  }

  return res.status(200).json({ post });
});

// A member may delete their own post.
// Moderators and admins may delete any post.
router.delete('/:id', requireAuth, (req, res) => {
  const post = posts.get(req.params.id);

  if (!post) {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: 'Post not found.'
      }
    });
  }

  if (!canModifyPost(post, req.user)) {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'You cannot delete a post owned by another user.'
      }
    });
  }

  posts.delete(req.params.id);

  return res.status(200).json({
    message: 'Post deleted successfully.'
  });
});

// Only moderators and admins may hide posts.
router.post(
  '/:id/hide',
  requireAuth,
  requireRole('moderator', 'admin'),
  (req, res) => {
    const post = posts.get(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Post not found.'
        }
      });
    }

    post.hidden = true;

    return res.status(200).json({
      message: 'Post hidden successfully.',
      post
    });
  }
);

module.exports = router;
