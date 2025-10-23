// functions/upload-material/src/main.js

import { Client, Databases, ID } from 'node-appwrite';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/**
 * Appwrite Function to generate S3 presigned URL for PDF uploads
 * and save metadata to Appwrite database
 */
export default async ({ req, res, log, error }) => {
  // CORS headers - Updated to include more headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Appwrite-Project, X-Appwrite-Response-Format',
    'Access-Control-Max-Age': '86400',
  };

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.json({ success: true }, 200, headers);
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.json(
      { success: false, message: 'Method not allowed. Use POST.' },
      405,
      headers
    );
  }

  try {
    // Parse request body
    let body;
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      error('Failed to parse request body:', parseError);
      throw new Error('Invalid JSON in request body');
    }

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
      isPublic,
      s3FileKey
    } = body;

    log('📥 Request received:', { 
      action, 
      courseId, 
      title, 
      fileName,
      fileType 
    });

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

    // ============================================
    // Action 1: Generate presigned URL for S3 upload
    // ============================================
    if (action === 'generate-url') {
      if (!fileName || !fileType || !courseId) {
        throw new Error('fileName, fileType, and courseId are required for generate-url action');
      }

      log('🔑 Generating presigned URL...');

      // Validate environment variables
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS credentials not configured');
      }

      if (!process.env.AWS_REGION) {
        throw new Error('AWS_REGION not configured');
      }

      const bucketName = process.env.S3_BUCKET_NAME || 'niyukti-private-pdfs';
      log('📦 Using S3 bucket:', bucketName);

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

      log('📄 File key:', fileKey);

      // Create presigned URL with proper headers
      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileKey,
        ContentType: fileType,
        // Add server-side encryption if needed
        // ServerSideEncryption: 'AES256',
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 // 1 hour
      });

      log('✅ Presigned URL generated successfully');

      return res.json(
        {
          success: true,
          uploadUrl,
          fileKey,
          expiresIn: 3600,
          bucket: bucketName,
          region: process.env.AWS_REGION
        },
        200,
        headers
      );
    }

    // ============================================
    // Action 2: Save metadata to Appwrite after successful S3 upload
    // ============================================
    if (action === 'save-metadata') {
      if (!courseId || !title || !week) {
        throw new Error('courseId, title, and week are required for save-metadata action');
      }

      if (!s3FileKey) {
        throw new Error('s3FileKey is required for save-metadata action');
      }

      log('💾 Saving metadata to database...');

      // Validate environment variables
      if (!process.env.DATABASE_ID || !process.env.MATERIALS_COLLECTION_ID) {
        throw new Error('Database configuration not found');
      }

      const materialData = {
        courseId,
        courseName: courseName || '',
        title,
        description: description || '',
        materialType: materialType || 'pdf',
        contentType: contentType || 'lecture',
        s3FileKey: s3FileKey,
        fileName: fileName || '',
        week: parseInt(week),
        order: parseInt(order || 0),
        isPublic: Boolean(isPublic),
        uploadDate: new Date().toISOString(),
      };

      log('📋 Material data:', materialData);

      // Save to Appwrite database
      const document = await databases.createDocument(
        process.env.DATABASE_ID,
        process.env.MATERIALS_COLLECTION_ID,
        ID.unique(),
        materialData
      );

      log('✅ Material saved to database:', { documentId: document.$id });

      return res.json(
        {
          success: true,
          document,
          message: 'Material metadata saved successfully'
        },
        200,
        headers
      );
    }

    // ============================================
    // Action 3: Combined action - generate URL and prepare for metadata save
    // ============================================
    if (action === 'upload-material') {
      if (!courseId || !title || !fileName || !fileType || !week) {
        throw new Error('courseId, title, fileName, fileType, and week are required for upload-material action');
      }

      log('🚀 Combined upload action starting...');

      // Validate environment variables
      if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
        throw new Error('AWS credentials not configured');
      }

      if (!process.env.AWS_REGION) {
        throw new Error('AWS_REGION not configured');
      }

      const bucketName = process.env.S3_BUCKET_NAME || 'niyukti-private-pdfs';

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
        Bucket: bucketName,
        Key: fileKey,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, { 
        expiresIn: 3600 
      });

      log('✅ Combined action - Presigned URL generated');

      // Return both URL and instruction to save metadata after upload
      return res.json(
        {
          success: true,
          uploadUrl,
          fileKey,
          expiresIn: 3600,
          message: 'Upload file to the URL, then call save-metadata action with the fileKey',
          nextStep: 'save-metadata'
        },
        200,
        headers
      );
    }

    // Unknown action
    throw new Error(`Unknown action: ${action}. Valid actions are: generate-url, save-metadata, upload-material`);

  } catch (err) {
    error('❌ Error occurred:', err.message);
    error('Stack trace:', err.stack);
    
    return res.json(
      {
        success: false,
        message: err.message,
        error: err.toString(),
      },
      400,
      headers
    );
  }
};