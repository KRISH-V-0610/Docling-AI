import express from 'express';
import {
    createProject,
    getUserProjects,
    getRecentProjects,
    getProjectById,
    uploadProjectFile,
    updateProjectFileContent,
    uploadMiddleware
} from '../controllers/projectController.js';
import { protectRoute } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply auth middleware to all project routes
router.use(protectRoute);

router.post('/', createProject);
router.get('/', getUserProjects);
router.get('/recent', getRecentProjects);
router.get('/:id', getProjectById);
router.post('/:id/files', uploadMiddleware.single('file'), uploadProjectFile);
router.put('/:id/files/:fileId', updateProjectFileContent);

export default router;
