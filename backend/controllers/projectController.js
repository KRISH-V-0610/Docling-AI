import Project from '../models/Project.js';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

// Multer in-memory storage for parsing text
const storage = multer.memoryStorage();
export const uploadMiddleware = multer({ storage });

// @desc    Create a new project
// @route   POST /api/projects
// @access  Private
export const createProject = async (req, res) => {
    try {
        const { title } = req.body;

        let finalTitle = title;
        if (!finalTitle || finalTitle.trim() === '') {
            // Auto-naming logic: find existing 'Untitled' projects for this user
            const untitledProjects = await Project.find({
                user: req.user._id,
                title: /^Untitled( \(\d+\))?$/
            });

            if (untitledProjects.length === 0) {
                finalTitle = 'Untitled';
            } else {
                // Extract numbers from "Untitled (X)"
                const numbers = untitledProjects.map(p => {
                    const match = p.title.match(/^Untitled \((\d+)\)$/);
                    return match ? parseInt(match[1], 10) : 0;
                });
                const maxNumber = Math.max(...numbers, 0);
                finalTitle = `Untitled (${maxNumber + 1})`;
            }
        }

        const newProject = await Project.create({
            user: req.user._id,
            title: finalTitle
        });

        res.status(201).json(newProject);
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
};

// @desc    Get all active projects for the logged in user
// @route   GET /api/projects
// @access  Private
export const getUserProjects = async (req, res) => {
    try {
        // Find projects belonging to user, sorted by newest first
        const projects = await Project.find({ user: req.user._id }).sort({ updatedAt: -1 });
        res.json(projects);
    } catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
};

// @desc    Get recent projects limit 2
// @route   GET /api/projects/recent
// @access  Private
export const getRecentProjects = async (req, res) => {
    try {
        const recentProjects = await Project.find({ user: req.user._id })
            .sort({ updatedAt: -1 })
            .limit(2);

        res.json(recentProjects);
    } catch (error) {
        console.error('Error fetching recent projects:', error);
        res.status(500).json({ error: 'Failed to fetch recent projects' });
    }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
export const getProjectById = async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            user: req.user._id
        });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (error) {
        console.error('Error fetching project:', error);
        res.status(500).json({ error: 'Failed to fetch project' });
    }
};

// @desc    Upload a file to a project (parses content)
// @route   POST /api/projects/:id/files
// @access  Private
export const uploadProjectFile = async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const { originalname, mimetype, buffer, size } = req.file;
        let extractedContent = '';

        // Extract text based on mime type
        const lowerName = originalname.toLowerCase();

        if (mimetype.includes('text') || lowerName.endsWith('.md') || lowerName.endsWith('.txt')) {
            extractedContent = buffer.toString('utf-8');
        } else if (mimetype === 'application/pdf' || lowerName.endsWith('.pdf')) {
            const data = await pdfParse(buffer);
            extractedContent = data.text;
        } else if (mimetype.includes('wordprocessingml') || lowerName.endsWith('.docx') || lowerName.endsWith('.doc')) {
            try {
                // Mammoth is primarily for docx, but attempt extraction
                const result = await mammoth.extractRawText({ buffer });
                extractedContent = result.value;
            } catch (err) {
                console.warn('Mammoth extraction warning for doc/docx:', err.message);
                // Last ditch raw ASCII extraction for legacy .doc buffers to avoid completely empty states
                extractedContent = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, '');
            }
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload .txt, .md, .pdf, or .doc/.docx' });
        }

        const newFile = {
            originalName: originalname,
            mimeType: mimetype,
            size: size,
            content: extractedContent || ''
        };

        console.log(`Document Uploaded: ${originalname} | Content Length: ${(extractedContent || '').length}`);

        project.files.push(newFile);
        await project.save();

        res.status(201).json(project.files[project.files.length - 1]);

    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to process file' });
    }
};

// @desc    Update a file's content (save from editor)
// @route   PUT /api/projects/:id/files/:fileId
// @access  Private
export const updateProjectFileContent = async (req, res) => {
    try {
        const { content } = req.body;
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });

        if (!project) return res.status(404).json({ error: 'Project not found' });

        const file = project.files.id(req.params.fileId);
        if (!file) return res.status(404).json({ error: 'File not found in project' });

        file.content = content;
        await project.save();

        res.json(file);
    } catch (error) {
        console.error('Error updating file:', error);
        res.status(500).json({ error: 'Failed to update file content' });
    }
};

// @desc    Rename a project
// @route   PUT /api/projects/:id
// @access  Private
export const renameProject = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title || title.trim() === '') {
            return res.status(400).json({ error: 'Title cannot be empty' });
        }

        const project = await Project.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { title: title.trim() },
            { new: true }
        );

        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json(project);
    } catch (error) {
        console.error('Error renaming project:', error);
        res.status(500).json({ error: 'Failed to rename project' });
    }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
// @access  Private
export const deleteProject = async (req, res) => {
    try {
        const project = await Project.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        if (!project) return res.status(404).json({ error: 'Project not found' });
        res.json({ message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project' });
    }
};

// @desc    Rename a file in a project
// @route   PUT /api/projects/:id/files/:fileId/rename
// @access  Private
export const renameProjectFile = async (req, res) => {
    try {
        const { originalName } = req.body;
        if (!originalName || originalName.trim() === '') {
            return res.status(400).json({ error: 'Filename cannot be empty' });
        }

        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const file = project.files.id(req.params.fileId);
        if (!file) return res.status(404).json({ error: 'File not found in project' });

        file.originalName = originalName.trim();
        await project.save();

        res.json(file);
    } catch (error) {
        console.error('Error renaming file:', error);
        res.status(500).json({ error: 'Failed to rename file' });
    }
};

// @desc    Delete a file from a project
// @route   DELETE /api/projects/:id/files/:fileId
// @access  Private
export const deleteProjectFile = async (req, res) => {
    try {
        const project = await Project.findOne({ _id: req.params.id, user: req.user._id });
        if (!project) return res.status(404).json({ error: 'Project not found' });

        const fileIndex = project.files.findIndex(f => f._id.toString() === req.params.fileId);
        if (fileIndex === -1) return res.status(404).json({ error: 'File not found in project' });

        // Remove file from array
        project.files.splice(fileIndex, 1);
        await project.save();

        res.json({ message: 'File deleted successfully', fileId: req.params.fileId });
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};
