import { Hono } from 'hono';
import {BlobServiceClient} from '@azure/storage-blob';
import dotenv from 'dotenv';

dotenv.config();

export const azureUploadRouter = new Hono()
    .post(
        '/upload',
        async (c) => {
            try {
                const body = await c.req.parseBody();

                const file = body['file'];
                const file_name = file['name'];

                if (!file || typeof file === 'string') {
                    return c.json({ error: 'No file uploaded' }, 400);
                }

                const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

                if (!AZURE_STORAGE_CONNECTION_STRING) {
                    throw Error('Azure Storage Connection string not found');
                }

                // Create the BlobServiceClient object with connection string
                const blobServiceClient = BlobServiceClient.fromConnectionString(
                    AZURE_STORAGE_CONNECTION_STRING
                );

                const containerName = 'upload-file-test';

                // Get a reference to a container
                const containerClient = blobServiceClient.getContainerClient(containerName);

                // Create a unique name for the blob
                const blobName = file_name;

                // Get a block blob client
                const blockBlobClient = containerClient.getBlockBlobClient(blobName);

                const arrayBuffer = await file.arrayBuffer(); // works in Hono (Web API)
                const buffer = Buffer.from(arrayBuffer);

                // this is where you set all blob options, including the header and content-type
                const blobOptions = { blobHTTPHeaders: { blobContentType: file.type }}; 

                // Upload data to the blob
                await blockBlobClient.uploadData(buffer, blobOptions);
                
                // await blockBlobClient.upload(bufferData, bufferData.length, blobOptions);

                return c.json({
                    success: true,
                });
            }
            catch (error){
                //returns any error by Azure
                return c.json(
                    {
                        success: false,
                        message: error,
                    },
                ); 
            }
        }
    )
    .post(
        '/list',
        async (c) => {

            try{
                const file_name = await c.req.text();

                const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;

                if (!AZURE_STORAGE_CONNECTION_STRING) {
                    throw Error('Azure Storage Connection string not found');
                }

                // Create the BlobServiceClient object with connection string
                const blobServiceClient = BlobServiceClient.fromConnectionString(
                    AZURE_STORAGE_CONNECTION_STRING
                );

                const containerName = 'upload-file-test';

                // Get a reference to a container
                const containerClient = blobServiceClient.getContainerClient(containerName);

                const maxPageSize = 1;

                const listOptions = {
                    includeMetadata: true,
                    includeSnapshots: true,
                    prefix: ''
                };

                const downloadLink = [];

                // require update: change this to get only the just uploaded file not all file
                const file_list = containerClient.getBlockBlobClient(file_name);
                console.log("file_list: ", file_list);
                console.log("file_list: ", file_list.name);
                console.log("file_list_url: ", file_list.url);

                return c.json({
                    success: true,
                    file_url: file_list.url,
                });
            }
            catch (error){
                //returns any error by Azure
                return c.json(
                    {
                        success: false,
                        message: error,
                    },
                ); 
            }
        }
    );