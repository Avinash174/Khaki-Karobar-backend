import { Router } from 'express';
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getBrands,
  createBrand,
} from './product.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.post('/', createProduct);
router.get('/', getProducts);
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.get('/brands', getBrands);
router.post('/brands', createBrand);
router.get('/:id', getProductById);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router;
