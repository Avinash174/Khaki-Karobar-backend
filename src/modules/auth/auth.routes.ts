import { Router } from 'express';
import { register, login, requestOtp, verifyOtp, refreshToken, me, logout } from './auth.controller';
import { validateBody } from '../../middleware/validate.middleware';
import { registerSchema, loginSchema, requestOtpSchema, verifyOtpSchema, refreshTokenSchema } from './auth.validation';
import { authenticateJwt } from '../../middleware/auth.middleware';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/otp/request', validateBody(requestOtpSchema), requestOtp);
router.post('/otp/verify', validateBody(verifyOtpSchema), verifyOtp);
router.post('/refresh-token', validateBody(refreshTokenSchema), refreshToken);
router.post('/refresh', validateBody(refreshTokenSchema), refreshToken);
router.get('/me', authenticateJwt, me);
router.post('/logout', authenticateJwt, logout);

export default router;
