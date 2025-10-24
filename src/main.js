const uploadToS3 = async (file) => {
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `courses/${courseId}/materials/${timestamp}-${sanitizedFileName}`
  
  try {
    setUploadStatus("Getting upload URL...")
    
    const requestBody = {
      action: "generate-url",
      fileName: file.name,
      fileType: file.type,
      courseId: courseId
    }

    console.log('📤 Sending request:', requestBody)
    
    // Use synchronous execution by adding path parameter
    const presignedResponse = await fetch(
      "https://fra.cloud.appwrite.io/v1/functions/YOUR_FUNCTION_ID/executions",
      {
        method: 'POST',
        headers: {
          "X-Appwrite-Project": "68511ac1000c3bac6acc",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          path: "/",
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(requestBody)  // This becomes req.body in the function
        })
      }
    )

    console.log('📥 Response status:', presignedResponse.status)

    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text()
      console.error('❌ Presigned URL Error Response:', errorText)
      throw new Error(`Failed to get presigned URL: ${presignedResponse.status}`)
    }

    const executionData = await presignedResponse.json()
    console.log('📦 Full execution data:', JSON.stringify(executionData, null, 2))

    // Parse the response body from the execution
    let functionResponse

    // Appwrite wraps the function response in different ways depending on version
    if (executionData.responseBody) {
      console.log('📄 Raw responseBody:', executionData.responseBody)
      try {
        functionResponse = JSON.parse(executionData.responseBody)
      } catch (e) {
        console.error('❌ Failed to parse responseBody:', e)
        console.error('Raw responseBody content:', executionData.responseBody)
        throw new Error('Invalid JSON in function response')
      }
    } else if (executionData.response) {
      console.log('📄 Using response field')
      functionResponse = typeof executionData.response === 'string' 
        ? JSON.parse(executionData.response) 
        : executionData.response
    } else {
      console.log('📄 Using executionData directly')
      functionResponse = executionData
    }

    console.log('✅ Parsed function response:', JSON.stringify(functionResponse, null, 2))

    // Check if response has the expected structure
    if (!functionResponse.uploadUrl || !functionResponse.fileKey) {
      console.error('❌ Missing uploadUrl or fileKey')
      console.error('Available keys:', Object.keys(functionResponse))
      console.error('Full response:', functionResponse)
      throw new Error(`Function response missing uploadUrl or fileKey. Response: ${JSON.stringify(functionResponse)}`)
    }

    const { uploadUrl, fileKey } = functionResponse
    console.log('🔗 Upload URL:', uploadUrl.substring(0, 50) + '...')
    console.log('🔑 File key:', fileKey)

    setUploadStatus("Uploading to S3...")
    setUploadProgress(40)

    console.log('📤 Uploading to S3...')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    console.log('📥 S3 Upload Response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('❌ S3 Upload Error:', errorText)
      throw new Error(`S3 upload failed: ${uploadResponse.status}`)
    }

    console.log('✅ File uploaded to S3 successfully')
    setUploadProgress(70)
    return fileKey
  } catch (error) {
    console.error('❌ S3 Upload Error:', error)
    throw error
  }
}const uploadToS3 = async (file) => {
  const timestamp = Date.now()
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
  const fileName = `courses/${courseId}/materials/${timestamp}-${sanitizedFileName}`
  
  try {
    setUploadStatus("Getting upload URL...")
    
    const requestBody = {
      action: "generate-url",
      fileName: file.name,
      fileType: file.type,
      courseId: courseId
    }

    console.log('📤 Sending request:', requestBody)
    
    const presignedResponse = await fetch(
      "https://fra.cloud.appwrite.io/v1/functions/YOUR_FUNCTION_ID/executions",
      {
        method: 'POST',
        headers: {
          "X-Appwrite-Project": "68511ac1000c3bac6acc",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          body: JSON.stringify(requestBody)  // Double stringify for Appwrite
        })
      }
    )

    console.log('📥 Response status:', presignedResponse.status)

    if (!presignedResponse.ok) {
      const errorText = await presignedResponse.text()
      console.error('❌ Presigned URL Error Response:', errorText)
      throw new Error(`Failed to get presigned URL: ${presignedResponse.status}`)
    }

    const executionData = await presignedResponse.json()
    console.log('📦 Full execution data:', JSON.stringify(executionData, null, 2))

    // Parse the response body from the execution
    let functionResponse

    // Appwrite wraps the function response in different ways depending on version
    if (executionData.responseBody) {
      console.log('📄 Raw responseBody:', executionData.responseBody)
      try {
        functionResponse = JSON.parse(executionData.responseBody)
      } catch (e) {
        console.error('❌ Failed to parse responseBody:', e)
        console.error('Raw responseBody content:', executionData.responseBody)
        throw new Error('Invalid JSON in function response')
      }
    } else if (executionData.response) {
      console.log('📄 Using response field')
      functionResponse = typeof executionData.response === 'string' 
        ? JSON.parse(executionData.response) 
        : executionData.response
    } else {
      console.log('📄 Using executionData directly')
      functionResponse = executionData
    }

    console.log('✅ Parsed function response:', JSON.stringify(functionResponse, null, 2))

    // Check if response has the expected structure
    if (!functionResponse.uploadUrl || !functionResponse.fileKey) {
      console.error('❌ Missing uploadUrl or fileKey')
      console.error('Available keys:', Object.keys(functionResponse))
      console.error('Full response:', functionResponse)
      throw new Error(`Function response missing uploadUrl or fileKey. Response: ${JSON.stringify(functionResponse)}`)
    }

    const { uploadUrl, fileKey } = functionResponse
    console.log('🔗 Upload URL:', uploadUrl.substring(0, 50) + '...')
    console.log('🔑 File key:', fileKey)

    setUploadStatus("Uploading to S3...")
    setUploadProgress(40)

    console.log('📤 Uploading to S3...')

    const uploadResponse = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    })

    console.log('📥 S3 Upload Response:', {
      status: uploadResponse.status,
      statusText: uploadResponse.statusText
    })

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      console.error('❌ S3 Upload Error:', errorText)
      throw new Error(`S3 upload failed: ${uploadResponse.status}`)
    }

    console.log('✅ File uploaded to S3 successfully')
    setUploadProgress(70)
    return fileKey
  } catch (error) {
    console.error('❌ S3 Upload Error:', error)
    throw error
  }
}