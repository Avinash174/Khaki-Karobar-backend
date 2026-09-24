import { Router } from 'express';
import { createBusiness, getMyBusinesses, getCurrentBusiness, updateBusiness } from './business.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';
import { requireBusinessRole } from '../../middleware/rbac.middleware';

const router = Router();

router.use(authenticateJwt);

router.post('/', createBusiness);
router.get('/my', getMyBusinesses);
router.get('/current', requireBusiness, getCurrentBusiness);
router.put('/current', requireBusiness, requireBusinessRole(['OWNER', 'ADMIN']), updateBusiness);

export default router;
