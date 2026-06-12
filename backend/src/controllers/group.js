const prisma = require('../config/database');
const { calculateBalances } = require('../utils/balanceEngine');

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
const createGroup = async (req, res, next) => {
  try {
    const { name, description, avatarUrl } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required.' });
    }

    const groupAvatar = avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(name)}`;

    // Create group and add creator as member in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: {
          name,
          description,
          avatarUrl: groupAvatar,
          createdById: req.user.id,
        },
      });

      await tx.groupMember.create({
        data: {
          groupId: group.id,
          userId: req.user.id,
        },
      });

      return group;
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all groups for the logged-in user
// @route   GET /api/groups
// @access  Private
const getGroups = async (req, res, next) => {
  try {
    // Find all group memberships for this user
    const memberships = await prisma.groupMember.findMany({
      where: { userId: req.user.id },
      include: {
        group: {
          include: {
            members: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            expenses: {
              include: {
                splits: true,
              },
            },
            settlements: true,
          },
        },
      },
    });

    // Process groups to append the user's net balance in each group
    const groupsWithBalances = memberships.map(membership => {
      const group = membership.group;
      const { memberBalances } = calculateBalances(group.members, group.expenses, group.settlements);
      
      const userBalance = memberBalances.find(b => b.userId === req.user.id);
      
      // Keep only necessary details to return
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        avatarUrl: group.avatarUrl,
        createdAt: group.createdAt,
        memberCount: group.members.length,
        userNetBalance: userBalance ? userBalance.netBalance : 0,
      };
    });

    res.json({
      success: true,
      data: groupsWithBalances,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed info for a single group
// @route   GET /api/groups/:id
// @access  Private
const getGroupDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if the user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.id,
        },
      },
    });

    if (!membership) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
        expenses: {
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            splits: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
        settlements: {
          include: {
            payer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            payee: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          orderBy: {
            date: 'desc',
          },
        },
      },
    });

    if (!group) {
      return res.status(404).json({ success: false, message: 'Group not found.' });
    }

    // Calculate balances and simplified debts
    const { memberBalances, debts } = calculateBalances(group.members, group.expenses, group.settlements);

    res.json({
      success: true,
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        avatarUrl: group.avatarUrl,
        createdAt: group.createdAt,
        creator: group.creator,
        members: group.members.map(m => m.user),
        expenses: group.expenses,
        settlements: group.settlements,
        balances: memberBalances,
        debts,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add member to group by email
// @route   POST /api/groups/:id/members
// @access  Private
const addMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email address is required.' });
    }

    // Verify requesting user is in the group
    const isRequesterMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.id,
        },
      },
    });

    if (!isRequesterMember) {
      return res.status(403).json({ success: false, message: 'You are not authorized to add members to this group.' });
    }

    // Find the user to add
    const userToAdd = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!userToAdd) {
      return res.status(404).json({
        success: false,
        message: `User with email ${email} is not registered. Please ask them to create an account first.`,
      });
    }

    // Check if user is already a member
    const existingMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: userToAdd.id,
        },
      },
    });

    if (existingMember) {
      return res.status(400).json({ success: false, message: 'User is already a member of this group.' });
    }

    // Add member
    const member = await prisma.groupMember.create({
      data: {
        groupId: id,
        userId: userToAdd.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      data: member.user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove member from group
// @route   DELETE /api/groups/:id/members/:userId
// @access  Private
const removeMember = async (req, res, next) => {
  try {
    const { id, userId } = req.params;

    // Verify requester is in the group
    const isRequesterMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.id,
        },
      },
    });

    if (!isRequesterMember) {
      return res.status(403).json({ success: false, message: 'You are not authorized to perform this action.' });
    }

    // Check if user to remove is in the group
    const memberToRemove = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    if (!memberToRemove) {
      return res.status(404).json({ success: false, message: 'User is not a member of this group.' });
    }

    // Fetch group context to check balance
    const group = await prisma.group.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: true,
          },
        },
        expenses: {
          include: {
            splits: true,
          },
        },
        settlements: true,
      },
    });

    const { memberBalances } = calculateBalances(group.members, group.expenses, group.settlements);
    const userBalance = memberBalances.find(b => b.userId === userId);

    if (userBalance && Math.abs(userBalance.netBalance) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Cannot remove member. ${userBalance.name} has a non-zero balance of ${userBalance.netBalance.toFixed(2)}. Please settle all debts first.`,
      });
    }

    // Delete membership
    await prisma.groupMember.delete({
      where: {
        groupId_userId: {
          groupId: id,
          userId,
        },
      },
    });

    res.json({
      success: true,
      message: 'Member removed successfully.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all chat messages for a group
// @route   GET /api/groups/:id/messages
// @access  Private
const getGroupMessages = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify user is in the group
    const isMember = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId: id,
          userId: req.user.id,
        },
      },
    });

    if (!isMember) {
      return res.status(403).json({ success: false, message: 'You are not a member of this group.' });
    }

    const messages = await prisma.message.findMany({
      where: { groupId: id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: messages,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupDetails,
  addMember,
  removeMember,
  getGroupMessages,
};

