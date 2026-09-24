import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function createBusiness(req: AuthenticatedRequest, res: Response): Promise<any> {
  const userId = req.user?.userId;
  const { name, legalName, gstin, pan, email, phone, address, city, state, stateCode, pincode } = req.body;

  if (!name || !phone) {
    return sendError(res, 'Business name and phone are required', 'MISSING_FIELDS', 400);
  }

  const business = await prisma.$transaction(async (tx) => {
    const biz = await tx.business.create({
      data: {
        name,
        legalName,
        gstin,
        pan,
        email,
        phone,
        address,
        city,
        state,
        stateCode: stateCode || '27',
        pincode,
      },
    });

    await tx.businessMember.create({
      data: {
        businessId: biz.id,
        userId: userId!,
        role: 'OWNER',
        permissions: ['ALL'],
      },
    });

    return biz;
  });

  return sendSuccess(res, 'Business created successfully', business, 201);
}

export async function getMyBusinesses(req: AuthenticatedRequest, res: Response): Promise<any> {
  const userId = req.user?.userId;

  const members = await prisma.businessMember.findMany({
    where: { userId },
    include: {
      business: true,
    },
  });

  const businesses = members.map((m) => ({
    ...m.business,
    userRole: m.role,
  }));

  return sendSuccess(res, 'Businesses retrieved successfully', businesses);
}

export async function getCurrentBusiness(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId;

  if (!businessId) {
    return sendError(res, 'No active business selected', 'BUSINESS_REQUIRED', 400);
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      members: {
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true, role: true },
          },
        },
      },
    },
  });

  if (!business) {
    return sendError(res, 'Business not found', 'BUSINESS_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Business details retrieved successfully', business);
}

export async function updateBusiness(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId;
  const { name, legalName, gstin, pan, email, phone, address, city, state, stateCode, pincode, logo } = req.body;

  if (!businessId) {
    return sendError(res, 'Active business required', 'BUSINESS_REQUIRED', 400);
  }

  const updated = await prisma.business.update({
    where: { id: businessId },
    data: {
      ...(name && { name }),
      ...(legalName !== undefined && { legalName }),
      ...(gstin !== undefined && { gstin }),
      ...(pan !== undefined && { pan }),
      ...(email !== undefined && { email }),
      ...(phone && { phone }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(state !== undefined && { state }),
      ...(stateCode !== undefined && { stateCode }),
      ...(pincode !== undefined && { pincode }),
      ...(logo !== undefined && { logo }),
    },
  });

  return sendSuccess(res, 'Business profile updated successfully', updated);
}
