import express from 'express';
import {
    createProject,
    getUserProjects,
    getRecentProjects,
    getProjectById,
    uploadProjectFile,
    updateProjectFileContent,
    renameProject,
    deleteProject,
    renameProjectFile,
    deleteProjectFile,
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
router.put('/:id', renameProject);
router.delete('/:id', deleteProject);

router.post('/:id/files', uploadMiddleware.single('file'), uploadProjectFile);
router.put('/:id/files/:fileId/rename', renameProjectFile);
router.put('/:id/files/:fileId', updateProjectFileContent);
router.delete('/:id/files/:fileId', deleteProjectFile);

export default router;
