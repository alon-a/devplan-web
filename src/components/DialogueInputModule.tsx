import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { Upload, Mic, FileText, X, Play, Square, Loader } from 'lucide-react';
import FileUpload from './FileUpload';
import AudioRecorder from './AudioRecorder';
import TranscriptInput from './TranscriptInput';

interface DialogueInputForm {
  title: string;
  content?: string;
}

type InputMethod = 'file' | 'recording' | 'transcript';

const DialogueInputModule: React.FC = () => {
  const [activeMethod, setActiveMethod] = useState<InputMethod>('file');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<DialogueInputForm>();

  const title = watch('title');

  const handleMethodChange = (method: InputMethod) => {
    setActiveMethod(method);
    setUploadProgress(0);
  };

  const onSubmit = async (data: DialogueInputForm) => {
    if (!title?.trim()) {
      toast.error('Please enter a title for your dialogue');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let response;

      if (activeMethod === 'file') {
        // File upload will be handled by FileUpload component
        return;
      } else if (activeMethod === 'recording') {
        // Audio recording will be handled by AudioRecorder component
        return;
      } else if (activeMethod === 'transcript') {
        // Submit transcript
        response = await submitTranscript(data);
      }

      if (response?.success) {
        toast.success('Dialogue submitted successfully!');
        reset();
        setUploadProgress(0);
        // Navigate to dialogues page or show success message
        navigate('/dialogues');
      }
    } catch (error) {
      console.error('Submission error:', error);
      toast.error('Failed to submit dialogue. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const submitTranscript = async (data: DialogueInputForm) => {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('content', data.content || '');
    formData.append('input_type', 'transcript');

    const response = await fetch('/api/dialogues/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });

    return response.json();
  };

  const handleFileUploadSuccess = (dialogue: any) => {
    toast.success('File uploaded successfully!');
    reset();
    navigate('/dialogues');
  };

  const handleRecordingSuccess = (dialogue: any) => {
    toast.success('Recording uploaded successfully!');
    reset();
    navigate('/dialogues');
  };

  const handleTranscriptSuccess = (dialogue: any) => {
    toast.success('Transcript submitted successfully!');
    reset();
    navigate('/dialogues');
  };

  const methods = [
    {
      id: 'file' as InputMethod,
      label: 'Upload File',
      icon: Upload,
      description: 'Upload audio or video files (max 100MB)'
    },
    {
      id: 'recording' as InputMethod,
      label: 'Record Audio',
      icon: Mic,
      description: 'Record audio directly in the browser'
    },
    {
      id: 'transcript' as InputMethod,
      label: 'Text Input',
      icon: FileText,
      description: 'Paste or type your transcript'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Submit Your Dialogue
        </h1>
        <p className="text-gray-600">
          Choose how you'd like to submit your dialogue for analysis and video generation.
        </p>
      </div>

      {/* Input Method Selector */}
      <div className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {methods.map((method) => {
            const Icon = method.icon;
            const isActive = activeMethod === method.id;
            
            return (
              <button
                key={method.id}
                onClick={() => handleMethodChange(method.id)}
                className={`p-6 rounded-lg border-2 transition-all duration-200 ${
                  isActive
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex flex-col items-center text-center">
                  <Icon className={`w-8 h-8 mb-3 ${isActive ? 'text-primary-600' : 'text-gray-500'}`} />
                  <h3 className="font-semibold mb-1">{method.label}</h3>
                  <p className="text-sm opacity-75">{method.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Title Input */}
      <div className="mb-6">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
          Dialogue Title *
        </label>
        <input
          type="text"
          id="title"
          {...register('title', { required: 'Title is required' })}
          className="input w-full"
          placeholder="Enter a title for your dialogue..."
        />
        {errors.title && (
          <p className="mt-1 text-sm text-red-600">{errors.title.message}</p>
        )}
      </div>

      {/* Progress Bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Uploading...</span>
            <span className="text-sm text-gray-500">{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Input Method Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        {activeMethod === 'file' && (
          <FileUpload
            onSuccess={handleFileUploadSuccess}
            onProgress={setUploadProgress}
            title={title}
          />
        )}
        
        {activeMethod === 'recording' && (
          <AudioRecorder
            onSuccess={handleRecordingSuccess}
            onProgress={setUploadProgress}
            title={title}
          />
        )}
        
        {activeMethod === 'transcript' && (
          <TranscriptInput
            onSuccess={handleTranscriptSuccess}
            register={register}
            errors={errors}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit(onSubmit)}
          />
        )}
      </div>

      {/* Help Text */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Supported Formats:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Audio:</strong> MP3, WAV, M4A, OGG, AAC (max 100MB)</li>
          <li>• <strong>Video:</strong> MP4, AVI, MOV, WebM, MKV (max 100MB)</li>
          <li>• <strong>Languages:</strong> English and Hebrew</li>
          <li>• <strong>Recording:</strong> Up to 30 minutes per session</li>
        </ul>
      </div>
    </div>
  );
};

export default DialogueInputModule; 