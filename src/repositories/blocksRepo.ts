import prisma from '../db.js';

export async function isUserBlocked(blockerId: number, blockedId: number) {
  const blockCount = await prisma.userBlock.count({
    where: {
      blockerId,
      blockedId,
    },
  });

  return blockCount > 0;
}

export async function canInteract(userId1: number, userId2: number) {
  const blockCount = await prisma.userBlock.count({
    where: {
      OR: [
        { blockerId: userId1, blockedId: userId2 },
        { blockerId: userId2, blockedId: userId1 },
      ],
    },
  });

  return blockCount === 0;
}

export async function blockUser(blockerId: number, blockedId: number) {
  await prisma.userBlock.create({
    data: {
      blockerId,
      blockedId,
    },
  });
}

export async function unblockUser(blockerId: number, blockedId: number) {
  const { count } = await prisma.userBlock.deleteMany({
    where: {
      blockerId,
      blockedId,
    },
  });

  return count > 0;
}
