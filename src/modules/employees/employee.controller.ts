import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function getEmployees(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const employees = await prisma.employee.findMany({
    where: { businessId, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, 'Employees retrieved successfully', employees);
}

export async function createEmployee(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name, phone, email, designation, salary, joiningDate } = req.body;

  if (!name || !phone) {
    return sendError(res, 'Employee name and phone are required', 'MISSING_FIELDS', 400);
  }

  const employee = await prisma.employee.create({
    data: {
      businessId,
      name,
      phone,
      email: email || null,
      designation: designation || null,
      salary: salary ? Number(salary) : 0,
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
    },
  });

  return sendSuccess(res, 'Employee created successfully', employee, 201);
}

export async function deleteEmployee(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  await prisma.employee.updateMany({
    where: { id, businessId },
    data: { isActive: false },
  });

  return sendSuccess(res, 'Employee removed successfully');
}
