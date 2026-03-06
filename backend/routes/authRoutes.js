import express from 'express';
import { signup, login, getProfile, updateProfilePic } from '../controllers/authController.js';
import { protectRoute } from '../middleware/authMiddleware.js';
import { upload } from '../config/cloudinary.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/profile', protectRoute, getProfile);
router.put('/profile/picture', protectRoute, upload.single('profileImage'), updateProfilePic);

export default router;
