import { Router } from 'express';
import { getGstr1Summary, getGstr3bSummary } from './gst.controller';
import { authenticateJwt, requireBusiness } from '../../middleware/auth.middleware';

const router = Router();

router.use(authenticateJwt, requireBusiness);

router.get('/gstr-1', getGstr1Summary);
router.get('/gstr-3b', getGstr3bSummary);

export default router;
