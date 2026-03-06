import Project from '../models/Project.js';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import { cloudinary } from '../config/cloudinary.js';

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

        const newProject = await Project.create({
            user: req.user._id,
            title: title || `New Document ${new Date().toLocaleDateString()}`
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
        if (mimetype === 'text/plain' || mimetype === 'text/markdown' || originalname.endsWith('.md')) {
            extractedContent = buffer.toString('utf-8');
        } else if (mimetype === 'application/pdf') {
            const data = await pdfParse(buffer);
            extractedContent = data.text;
        } else if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || originalname.endsWith('.docx') || originalname.endsWith('.doc')) {
            const result = await mammoth.extractRawText({ buffer });
            extractedContent = result.value;
        } else {
            return res.status(400).json({ error: 'Unsupported file type. Please upload .txt, .md, .pdf, or .doc/.docx' });
        }

        // Upload to Cloudinary using upload_stream for raw file types
        const uploadToCloudinary = (fileBuffer, fileName) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: 'docling_documents', resource_type: 'raw', public_id: fileName },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(fileBuffer);
            });
        };

        let cloudUrl = '';
        try {
            const uploadResult = await uploadToCloudinary(buffer, originalname);
            cloudUrl = uploadResult.secure_url;
        } catch (uploadError) {
            console.error('Cloudinary upload error:', uploadError);
            return res.status(500).json({ error: 'Failed to offload document to Cloudinary.' });
        }

        const newFile = {
            originalName: originalname,
            mimeType: mimetype,
            size: size,
            cloudUrl: cloudUrl,
            content: extractedContent
        };

        console.log(`Document Uploaded! Extracted Content Length: ${extractedContent.length}`);

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
