import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../utils/jwt';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export async function register(req: Request, res: Response): Promise<any> {
  const { name, phone, email, password, businessName } = req.body;

  const existing = await prisma.user.findFirst({
    where: {
      OR: [
        { phone },
        ...(email ? [{ email }] : []),
      ],
    },
  });

  if (existing) {
    return sendError(res, 'User with this phone number or email already exists', 'USER_EXISTS', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        phone,
        email: email || null,
        passwordHash,
        role: 'USER',
      },
    });

    let business = null;
    if (businessName) {
      business = await tx.business.create({
        data: {
          name: businessName,
          phone,
          email: email || null,
        },
      });

      await tx.businessMember.create({
        data: {
          businessId: business.id,
          userId: user.id,
          role: 'OWNER',
          permissions: ['ALL'],
        },
      });
    }

    return { user, business };
  });

  const accessToken = generateAccessToken({
    userId: result.user.id,
    role: result.user.role,
    phone: result.user.phone,
    email: result.user.email,
    businessId: result.business?.id,
  });

  const refreshToken = generateRefreshToken({ userId: result.user.id });

  // Store refresh token in DB
  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 30);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: result.user.id,
      expiresAt: refreshExpires,
    },
  });

  return sendSuccess(res, 'Account registered successfully', {
    user: {
      id: result.user.id,
      name: result.user.name,
      phone: result.user.phone,
      email: result.user.email,
      role: result.user.role,
    },
    business: result.business,
    accessToken,
    refreshToken,
  }, 201);
}

export async function login(req: Request, res: Response): Promise<any> {
  const { phone, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { phone },
    include: {
      memberships: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!user || !user.isActive) {
    return sendError(res, 'Invalid phone number or password', 'INVALID_CREDENTIALS', 401);
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return sendError(res, 'Invalid phone number or password', 'INVALID_CREDENTIALS', 401);
  }

  const primaryBusiness = user.memberships[0]?.business || null;

  const accessToken = generateAccessToken({
    userId: user.id,
    role: user.role,
    phone: user.phone,
    email: user.email,
    businessId: primaryBusiness?.id,
  });

  const refreshToken = generateRefreshToken({ userId: user.id });

  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 30);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: refreshExpires,
    },
  });

  return sendSuccess(res, 'Login successful', {
    user: {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      role: user.role,
    },
    businesses: user.memberships.map((m) => ({
      ...m.business,
      role: m.role,
    })),
    activeBusiness: primaryBusiness,
    accessToken,
    refreshToken,
  });
}

export async function requestOtp(req: Request, res: Response): Promise<any> {
  const { phone, purpose } = req.body;

  // In production, integrate SMS provider (MSG91 / Fast2SMS / Twilio).
  // Standard test OTP is 123456 or random 6 digits.
  const otp = '123456';
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await prisma.otpVerification.create({
    data: {
      phone,
      otp,
      purpose,
      expiresAt,
    },
  });

  return sendSuccess(res, 'OTP dispatched successfully (Use 123456 for instant verification)', {
    phone,
    expiresInSeconds: 300,
  });
}

export async function verifyOtp(req: Request, res: Response): Promise<any> {
  const { phone, otp, name } = req.body;

  const validOtp = await prisma.otpVerification.findFirst({
    where: {
      phone,
      otp,
      verified: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (!validOtp && otp !== '123456') {
    return sendError(res, 'Invalid or expired OTP', 'INVALID_OTP', 400);
  }

  if (validOtp) {
    await prisma.otpVerification.update({
      where: { id: validOtp.id },
      data: { verified: true },
    });
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { phone },
    include: {
      memberships: {
        include: { business: true },
      },
    },
  });

  if (!user) {
    const dummyHash = await bcrypt.hash('KhakiUser@' + Math.random().toString(36).slice(-6), 10);
    user = await prisma.user.create({
      data: {
        phone,
        name: name || `User ${phone.slice(-4)}`,
        passwordHash: dummyHash,
        role: 'USER',
      },
      include: {
        memberships: {
          include: { business: true },
        },
      },
    });

    // Auto create default business for fresh user
    const defaultBusiness = await prisma.business.create({
      data: {
        name: `${user.name}'s Enterprise`,
        phone,
      },
    });

    await prisma.businessMember.create({
      data: {
        businessId: defaultBusiness.id,
        userId: user.id,
        role: 'OWNER',
        permissions: ['ALL'],
      },
    });

    // Refetch
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: { include: { business: true } },
      },
    }) as any;
  }

  const primaryBusiness = user?.memberships[0]?.business || null;

  const accessToken = generateAccessToken({
    userId: user!.id,
    role: user!.role,
    phone: user!.phone,
    email: user!.email,
    businessId: primaryBusiness?.id,
  });

  const refreshToken = generateRefreshToken({ userId: user!.id });

  const refreshExpires = new Date();
  refreshExpires.setDate(refreshExpires.getDate() + 30);
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user!.id,
      expiresAt: refreshExpires,
    },
  });

  return sendSuccess(res, 'OTP verified successfully', {
    user: {
      id: user!.id,
      name: user!.name,
      phone: user!.phone,
      email: user!.email,
      role: user!.role,
    },
    businesses: user!.memberships.map((m) => ({
      ...m.business,
      role: m.role,
    })),
    activeBusiness: primaryBusiness,
    accessToken,
    refreshToken,
  });
}

export async function refreshToken(req: Request, res: Response): Promise<any> {
  const { refreshToken: token } = req.body;

  try {
    const payload = verifyRefreshToken(token);

    const stored = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      return sendError(res, 'Refresh token is expired or revoked', 'INVALID_REFRESH_TOKEN', 401);
    }

    const newAccessToken = generateAccessToken({
      userId: stored.user.id,
      role: stored.user.role,
      phone: stored.user.phone,
      email: stored.user.email,
    });

    return sendSuccess(res, 'Token refreshed successfully', {
      accessToken: newAccessToken,
    });
  } catch (err) {
    return sendError(res, 'Invalid refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }
}

export async function me(req: AuthenticatedRequest, res: Response): Promise<any> {
  const userId = req.user?.userId;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
      role: true,
      avatar: true,
      createdAt: true,
      memberships: {
        include: {
          business: true,
        },
      },
    },
  });

  if (!user) {
    return sendError(res, 'User not found', 'USER_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Profile retrieved successfully', user);
}

export async function logout(req: AuthenticatedRequest, res: Response): Promise<any> {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }
  return sendSuccess(res, 'Logged out successfully');
}
