import { type Writable, get } from 'svelte/store';
import {
  lessonDocUpload,
  lessonVideoUpload
} from '$lib/components/Course/components/Lesson/store/lessons';

import axios from 'axios';
import { classroomio } from '$lib/utils/services/api';
import { env } from '$env/dynamic/public';

export type UploadType = 'document' | 'video' | 'generic';

export class GenericUploader {
  public abortController: AbortController | null = null;
  private uploadType: UploadType;
  private uploadStore: Writable<any>;

  constructor(uploadType: UploadType) {
    this.uploadType = uploadType;
    this.uploadStore = uploadType === 'document' ? lessonDocUpload : lessonVideoUpload;
    this.abortController = new AbortController();
  }

  async getDownloadPresignedUrl(keys: string[], type = this.uploadType) {
    const endpoint =
      type === 'document'
        ? classroomio.course.presign.document.download
        : classroomio.course.presign.video.download;

    const response = await endpoint.$post({
      json: {
        keys
      }
    });

    return response.json();
  }

  async getAllDownloadPresignedUrl(videoKeys: string[], docKeys: string[]) {
    const urls = {
      videos: {},
      documents: {}
    };

    try {
      if (videoKeys.length) {
        const videoResponse = await this.getDownloadPresignedUrl(videoKeys, 'video');
        urls.videos = videoResponse?.urls || {};
      }

      if (docKeys.length) {
        const docResponse = await this.getDownloadPresignedUrl(docKeys, 'document');
        urls.documents = docResponse?.urls || {};
      }
    } catch (error) {
      console.error('Error getting download presigned url:', error);
    }

    return urls;
  }

  async getPresignedUrl(file: File) {
    const endpoint =
      this.uploadType === 'document'
        ? classroomio.course.presign.document.upload
        : classroomio.course.presign.video.upload;

    const response = await endpoint.$post({
      json: {
        fileName: file?.name,
        fileType: file?.type
      }
    });

    return response.json();
  }

  async uploadToAzure(file: File){
    try{

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${env.PUBLIC_SERVER_URL}/course/azureUpload/upload`, {
        method: 'POST',
        body: formData,
      });

      //check if backend returns any HTTP error
      const data = await response.json();

      if (!data.success){
        return {
          status: false,
          message: data.message,
        };
      }
      
      return {status:true};
    }
    catch(error){
      console.error("Error uploading to Azure Blob Storage: ", error);

      //returns if there is a network error
      return {
        status: false,
        message: error,
      };
    }
  }

  async listFromAzure(fileName){
    try{

      const response = await fetch(`${env.PUBLIC_SERVER_URL}/course/azureUpload/list`, {
        method: 'POST',
        body: fileName,
      });

      const data = await response.json();

      if (!data.success){
        return {
          status: false,
          message: data.message,
        };
      }
      
      return {
        status:true,
        file_url: data.file_url,
      };
    }
    catch(error){
      console.error("Error getting download link Azure Blob Storage: ", error);

      return {
        status: false,
        message: error,
      };
    }
  }

  async uploadFile(params: { url: string; file: File }) {
    await axios.put(params.url, params.file, {
      headers: {
        'Content-Type': params.file.type
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      signal: this.abortController?.signal,
      onUploadProgress: (progressEvent) => {
        if (get(this.uploadStore).isCancelled) {
          this.abortController?.abort();
          return;
        }

        const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
        this.uploadStore.update((state) => ({
          ...state,
          uploadProgress: progress
        }));
      }
    });
  }

  initUpload() {
    this.uploadStore.update((state) => ({
      ...state,
      isUploading: true,
      uploadProgress: 0,
      error: null,
      isCancelled: false
    }));

    this.abortController = new AbortController();
  }

  cancelUpload() {
    this.uploadStore.update((store) => ({
      ...store,
      isCancelled: true,
      isUploading: false
    }));

    this.abortController?.abort();
    this.abortController = null;
  }
}

export class DocumentUploader extends GenericUploader {
  constructor() {
    super('document');
  }
}

export class VideoUploader extends GenericUploader {
  constructor() {
    super('video');
  }
}
