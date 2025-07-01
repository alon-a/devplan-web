import React, { useState, useRef, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileAudio, FileVideo, File, Loader } from 'lucide-react';
import toast from 'react-hot-toast';

interface FileUploadProps {
  onSuccess: (dialogue: any) => void;
  onProgress: (progress: number) => void;
  title: string;
}

interface FileWithPreview extends File {
  preview?: string;
  type: 'audio' | 'video';
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, onProgress, title }) => {
  const [selectedFile, setSelectedFile] = useState<FileWithPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const allowedAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/m4a', 'audio/ogg', 'audio/mp3'];
  const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/webm', 'video/mkv'];
  const maxFileSize = 100 * 1024 * 1024; // 100MB

  const validateFile = (file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize) {
      return `File too large. Maximum size is 100MB.`;
    }

    // Check file type
    const isAudio = allowedAudioTypes.includes(file.type);
    const isVideo = allowedVideoTypes.includes(file.type);

    if (!isAudio && !isVideo) {
      return `Unsupported file type. Please upload audio (MP3, WAV, M4A, OGG) or video (MP4, MOV, AVI, WebM) files.`;
    }

    return null;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    const fileWithPreview: FileWithPreview = {
      ...file,
      type: file.type.startsWith('audio/') ? 'audio' : 'video',
      preview: URL.createObjectURL(file)
    };

    setSelectedFile(fileWithPreview);
    setUploadError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.m4a', '.ogg', '.aac'],
      'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleUpload = async () => {
    if (!selectedFile || !title?.trim()) {
      toast.error('Please select a file and enter a title');
      return;
    }

    setIsUploading(true);
    onProgress(0);

    try {
      const formData = new FormData();
      formData.append('audio_file', selectedFile);
      formData.append('title', title);
      formData.append('input_type', 'file');

      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          onProgress(progress);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          if (response.success) {
            onSuccess(response.data.dialogue);
            toast.success('File uploaded successfully!');
          } else {
            throw new Error(response.error || 'Upload failed');
          }
        } else {
          throw new Error(`Upload failed with status: ${xhr.status}`);
        }
      });

      xhr.addEventListener('error', () => {
        throw new Error('Network error during upload');
      });

      xhr.open('POST', '/api/dialogues/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('token')}`);
      xhr.send(formData);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      onProgress(0);
    }
  };

  const removeFile = () => {
    if (selectedFile?.preview) {
      URL.revokeObjectURL(selectedFile.preview);
    }
    setSelectedFile(null);
    setUploadError(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file: FileWithPreview) => {
    if (file.type === 'audio') {
      return <FileAudio className="w-8 h-8 text-blue-500" />;
    } else {
      return <FileVideo className="w-8 h-8 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDragActive ? 'Drop your file here' : 'Drag & drop your file here'}
          </h3>
          <p className="text-gray-600 mb-4">
            or click to browse files
          </p>
          <div className="text-sm text-gray-500">
            <p>Supported formats: MP3, WAV, M4A, OGG, MP4, MOV, AVI, WebM</p>
            <p>Maximum file size: 100MB</p>
          </div>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(selectedFile)}
              <div>
                <h4 className="font-medium text-gray-900">{selectedFile.name}</h4>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)} • {selectedFile.type.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={removeFile}
              className="text-gray-400 hover:text-gray-600"
              disabled={isUploading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {uploadError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{uploadError}</p>
            </div>
          )}

          <div className="mt-4">
            <button
              onClick={handleUpload}
              disabled={isUploading || !title?.trim()}
              className="btn-primary w-full flex items-center justify-center"
            >
              {isUploading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload File
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Upload Instructions:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Ensure your file is clear and has good audio quality</li>
          <li>• For video files, audio quality is most important</li>
          <li>• Supported languages: English and Hebrew</li>
          <li>• Maximum recording length: 30 minutes</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload; 