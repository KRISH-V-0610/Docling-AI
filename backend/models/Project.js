import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
    originalName: { type: String, required: true },
    storedName: { type: String }, // Can be local path, S3, or Cloudinary depending on storage
    mimeType: { type: String, required: true },
    size: { type: Number },
    content: { type: String, default: '' }, // For parsed text/md to show in web editor
}, { timestamps: true });

const projectSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
            default: 'Untitled Project'
        },
        status: {
            type: String,
            enum: ['Draft', 'Processing', 'Completed'],
            default: 'Draft'
        },
        // The robust file system for the project workspace
        files: [fileSchema]
    },
    {
        timestamps: true, // Automatically manages createdAt and updatedAt
    }
);

export default mongoose.model('Project', projectSchema);
