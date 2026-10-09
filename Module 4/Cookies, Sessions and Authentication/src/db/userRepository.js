const prisma = require('./prisma');

async function findUserByEmail(email) {
  return prisma.user.findUnique({
    where: { email },
  });
}

async function findSafeUserById(id) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });
}

module.exports = {
  findUserByEmail,
  findSafeUserById,
};
