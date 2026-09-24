import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import prisma from '../../config/prisma';
import { sendSuccess, sendError } from '../../utils/api-response';

export async function createProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const {
    name,
    sku,
    barcode,
    description,
    categoryId,
    brandId,
    unit,
    hsnCode,
    purchasePrice,
    sellingPrice,
    mrp,
    gstRate,
    minStockAlert,
    initialStock,
    isService,
  } = req.body;

  if (!name) {
    return sendError(res, 'Product name is required', 'MISSING_FIELDS', 400);
  }

  const stock = Number(initialStock) || 0;

  const product = await prisma.$transaction(async (tx) => {
    const prod = await tx.product.create({
      data: {
        businessId,
        name,
        sku: sku || null,
        barcode: barcode || null,
        description: description || null,
        categoryId: categoryId || null,
        brandId: brandId || null,
        unit: unit || 'PCS',
        hsnCode: hsnCode || null,
        purchasePrice: Number(purchasePrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        mrp: mrp ? Number(mrp) : null,
        gstRate: Number(gstRate) || 0,
        minStockAlert: minStockAlert !== undefined ? Number(minStockAlert) : 5,
        currentStock: stock,
        isService: Boolean(isService),
      },
      include: {
        category: true,
        brand: true,
      },
    });

    if (stock > 0 && !isService) {
      await tx.stockMovement.create({
        data: {
          businessId,
          productId: prod.id,
          type: 'INITIAL',
          quantity: stock,
          previousStock: 0,
          currentStock: stock,
          referenceType: 'INITIAL_STOCK',
          notes: 'Opening stock entry',
        },
      });
    }

    return prod;
  });

  return sendSuccess(res, 'Product created successfully', product, 201);
}

export async function getProducts(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const search = (req.query.search as string) || '';
  const categoryId = req.query.categoryId as string;
  const brandId = req.query.brandId as string;
  const lowStockOnly = req.query.lowStock === 'true';

  const whereClause: any = {
    businessId,
    isActive: true,
  };

  if (search) {
    whereClause.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { barcode: { contains: search, mode: 'insensitive' } },
      { hsnCode: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    whereClause.categoryId = categoryId;
  }

  if (brandId) {
    whereClause.brandId = brandId;
  }

  const [total, products] = await Promise.all([
    prisma.product.count({ where: whereClause }),
    prisma.product.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      include: {
        category: true,
        brand: true,
      },
    }),
  ]);

  let items = products;
  if (lowStockOnly) {
    items = products.filter((p) => Number(p.currentStock) <= Number(p.minStockAlert));
  }

  return sendSuccess(res, 'Products retrieved successfully', {
    items,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
}

export async function getProductById(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const product = await prisma.product.findFirst({
    where: { id, businessId },
    include: {
      category: true,
      brand: true,
      stockMovements: {
        orderBy: { date: 'desc' },
        take: 20,
      },
    },
  });

  if (!product) {
    return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
  }

  return sendSuccess(res, 'Product retrieved successfully', product);
}

export async function updateProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;
  const {
    name,
    sku,
    barcode,
    description,
    categoryId,
    brandId,
    unit,
    hsnCode,
    purchasePrice,
    sellingPrice,
    mrp,
    gstRate,
    minStockAlert,
  } = req.body;

  const existing = await prisma.product.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
  }

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(sku !== undefined && { sku }),
      ...(barcode !== undefined && { barcode }),
      ...(description !== undefined && { description }),
      ...(categoryId !== undefined && { categoryId: categoryId || null }),
      ...(brandId !== undefined && { brandId: brandId || null }),
      ...(unit && { unit }),
      ...(hsnCode !== undefined && { hsnCode }),
      ...(purchasePrice !== undefined && { purchasePrice: Number(purchasePrice) }),
      ...(sellingPrice !== undefined && { sellingPrice: Number(sellingPrice) }),
      ...(mrp !== undefined && { mrp: mrp ? Number(mrp) : null }),
      ...(gstRate !== undefined && { gstRate: Number(gstRate) }),
      ...(minStockAlert !== undefined && { minStockAlert: Number(minStockAlert) }),
    },
    include: {
      category: true,
      brand: true,
    },
  });

  return sendSuccess(res, 'Product updated successfully', updated);
}

export async function deleteProduct(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const id = req.params.id as string;

  const existing = await prisma.product.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return sendError(res, 'Product not found', 'PRODUCT_NOT_FOUND', 404);
  }

  await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return sendSuccess(res, 'Product deleted successfully');
}

// Categories & Brands
export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const categories = await prisma.category.findMany({
    where: { businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, 'Categories retrieved successfully', categories);
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name, description } = req.body;
  if (!name) return sendError(res, 'Category name is required', 'MISSING_FIELDS', 400);

  const cat = await prisma.category.create({
    data: { businessId, name, description },
  });
  return sendSuccess(res, 'Category created successfully', cat, 201);
}

export async function getBrands(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const brands = await prisma.brand.findMany({
    where: { businessId },
    include: { _count: { select: { products: true } } },
    orderBy: { name: 'asc' },
  });
  return sendSuccess(res, 'Brands retrieved successfully', brands);
}

export async function createBrand(req: AuthenticatedRequest, res: Response): Promise<any> {
  const businessId = req.businessId!;
  const { name } = req.body;
  if (!name) return sendError(res, 'Brand name is required', 'MISSING_FIELDS', 400);

  const brand = await prisma.brand.create({
    data: { businessId, name },
  });
  return sendSuccess(res, 'Brand created successfully', brand, 201);
}
