// functions/upload-material/src/main.js

import { Client, Databases, ID } from 'node-appwrite';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Appwrite Function to generate S3 presigned URL for PDF uploads
 * and save metadata to Appwrite database
 */
export default async ({ req, res, log, error }) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.json({ success: true }, 200, headers);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.json(
      { success: false, message: 'Method not allowed' },
      405,
      headers
    );
  }

  try {
    // Parse request body
    const body = JSON.parse(req.body || '{}');
    const { 
      action, 
      courseId, 
      courseName,
      title, 
      description,
      materialType,
      contentType,
      fileName, 
      fileType,
      week,
      order,
      isPublic
    } = body;

    log('Request received:', { action, courseId, title, fileName });

    // Validate required fields
    if (!action) {
      throw new Error('Action is required (generate-url or save-metadata)');
    }

    // Initialize Appwrite client
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);

    // Action 1: Generate presigned URL for S3 upload
    if (action === 'generate-url') {
      if (!fileName || !fileType || !courseId) {
        throw new Error('fileName, fileType, and courseId are required');
      }

      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Generate unique file key
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `courses/${courseId}/materials/${timestamp}-${sanitizedFileName}`;

      // Create presigned URL
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'niyukti-private-pdfs',
        Key: fileKey,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 // 1 hour
      });

      log('Presigned URL generated:', { fileKey });

      return res.json(
        {
          success: true,
          uploadUrl,
          fileKey,
        },
        200,
        headers
      );
    }

    // Action 2: Save metadata to Appwrite after successful S3 upload
    if (action === 'save-metadata') {
      if (!courseId || !title || !week) {
        throw new Error('courseId, title, and week are required');
      }

      const materialData = {
        courseId,
        courseName: courseName || '',
        title,
        description: description || '',
        materialType: materialType || 'pdf',
        contentType: contentType || 'lecture',
        s3FileKey: body.s3FileKey || '',
        fileName: fileName || '',
        week: parseInt(week),
        order: parseInt(order || 0),
        isPublic: isPublic || false,
        uploadDate: new Date().toISOString(),
      };

      // Save to Appwrite database
      const document = await databases.createDocument(
        process.env.DATABASE_ID,
        process.env.MATERIALS_COLLECTION_ID,
        ID.unique(),
        materialData
      );

      log('Material saved to database:', { documentId: document.$id });

      return res.json(
        {
          success: true,
          document,
        },
        200,
        headers
      );
    }

    // Action 3: Combined action - generate URL and prepare for metadata save
    if (action === 'upload-material') {
      if (!courseId || !title || !fileName || !fileType || !week) {
        throw new Error('courseId, title, fileName, fileType, and week are required');
      }

      // Initialize S3 client
      const s3Client = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        },
      });

      // Generate unique file key
      const timestamp = Date.now();
      const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileKey = `courses/${courseId}/materials/${timestamp}-${sanitizedFileName}`;

      // Create presigned URL
      const command = new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'niyukti-private-pdfs',
        Key: fileKey,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 
      });

      log('Combined action - Presigned URL generated:', { fileKey });

      // Return both URL and instruction to save metadata after upload
      return res.json(
        {
          success: true,
          uploadUrl,
          fileKey,
          message: 'Upload file to the URL, then call save-metadata action',
        },
        200,
        headers
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    error('Error:', err.message);
    return res.json(
      {
        success: false,
        message: err.message,
      },
      400,
      headers
    );
  }
};