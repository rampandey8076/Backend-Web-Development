const initialPosts = [
  { id: '1', title: 'Post by member A', authorId: 'u-A', hidden: false },
  { id: '2', title: 'Post by member B', authorId: 'u-B', hidden: false },
  { id: '3', title: 'Another post by member A', authorId: 'u-A', hidden: false }
];

const initialUsers = [
  { id: 'u-A', name: 'Member A' },
  { id: 'u-B', name: 'Member B' },
  { id: 'u-M', name: 'Moderator' },
  { id: 'u-ADMIN', name: 'Admin' }
];

const posts = new Map();
const users = new Map();

function resetData() {
  posts.clear();
  users.clear();

  for (const post of initialPosts) {
    posts.set(post.id, { ...post });
  }

  for (const user of initialUsers) {
    users.set(user.id, { ...user });
  }
}

resetData();

module.exports = { posts, users, resetData };
