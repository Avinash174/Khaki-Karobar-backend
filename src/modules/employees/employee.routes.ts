import { Router } from 'express';
import { getEmployees, createEmployee, deleteEmployee } from './employee.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.get('/', getEmployees);
router.post('/', createEmployee);
router.delete('/:id', deleteEmployee);

export default router;
