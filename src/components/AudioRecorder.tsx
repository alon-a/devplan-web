import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Loader, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioRecorderProps {
  onSuccess: (dialogue: any) => void;
  onProgress: (progress: number) => void;
  title: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSuccess, onProgress, title }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const maxRecordingTime = 30 * 60; // 30 minutes in seconds

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => {
        if (prev >= maxRecordingTime) {
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const requestMicrophonePermission = async (): Promise<MediaStream> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      return stream;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('Microphone access denied. Please allow microphone access and try again.');
        } else if (error.name === 'NotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw new Error('Failed to access microphone. Please check your device settings.');
        }
      }
      throw new Error('Failed to access microphone.');
    }
  };

  const startRecording = async () => {
    if (!title?.trim()) {
      toast.error('Please enter a title before recording');
      return;
    }

    try {
      setError(null);
      const stream = await requestMicrophonePermission();
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Recording failed. Please try again.');
        setIsRecording(false);
        stopTimer();
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setRecordingTime(0);
      startTimer();
      
      toast.success('Recording started');
    } catch (error) {
      console.error('Start recording error:', error);
      setError(error instanceof Error ? error.message : 'Failed to start recording');
      toast.error('Failed to start recording');
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      stopTimer();
    }
  };

  const playRecording = () => {
    if (audioElementRef.current && audioUrl) {
      audioElementRef.current.play();
      setIsPlaying(true);
    }
  };

  const pausePlayback = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handlePlaybackEnded = () => {
    setIsPlaying(false);
  };

  const uploadRecording = async () => {
    if (!audioBlob || !title?.trim()) {
      toast.error('No recording to upload or missing title');
      return;
    }

    setIsUploading(true);
    onProgress(0);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

      const response = await fetch('/api/dialogues/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          audio_data: base64,
        }),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess(result.data.dialogue);
        toast.success('Recording uploaded successfully!');
      } else {
        throw new Error(result.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      toast.error('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      onProgress(0);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    setIsRecording(false);
    setIsPaused(false);
    setIsPlaying(false);
    stopTimer();
  };

  return (
    <div className="space-y-6">
      {/* Recording Controls */}
      <div className="text-center">
        {!isRecording && !audioBlob && (
          <button
            onClick={startRecording}
            disabled={!title?.trim()}
            className="btn-primary btn-lg flex items-center justify-center mx-auto"
          >
            <Mic className="w-6 h-6 mr-2" />
            Start Recording
          </button>
        )}

        {isRecording && (
          <div className="space-y-4">
            <div className="text-2xl font-mono font-bold text-red-600">
              {formatTime(recordingTime)}
            </div>
            <div className="flex items-center justify-center space-x-4">
              {isPaused ? (
                <button
                  onClick={resumeRecording}
                  className="btn-secondary flex items-center"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </button>
              ) : (
                <button
                  onClick={pauseRecording}
                  className="btn-secondary flex items-center"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </button>
              )}
              <button
                onClick={stopRecording}
                className="btn-outline flex items-center"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop
              </button>
            </div>
          </div>
        )}

        {/* Recording Progress */}
        {isRecording && (
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-red-500 h-2 rounded-full transition-all duration-1000"
              style={{ width: `${(recordingTime / maxRecordingTime) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Recording Preview */}
      {audioBlob && audioUrl && (
        <div className="border border-gray-200 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Recording Preview</h4>
          
          <audio
            ref={audioElementRef}
            src={audioUrl}
            onEnded={handlePlaybackEnded}
            className="w-full mb-4"
            controls
          />

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Duration: {formatTime(recordingTime)} • Size: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={resetRecording}
                className="btn-outline btn-sm"
                disabled={isUploading}
              >
                Record Again
              </button>
              <button
                onClick={uploadRecording}
                disabled={isUploading || !title?.trim()}
                className="btn-primary btn-sm flex items-center"
              >
                {isUploading ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Upload Recording
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Recording Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Find a quiet environment for best audio quality</li>
          <li>• Speak clearly and at a normal pace</li>
          <li>• Keep the microphone at a consistent distance</li>
          <li>• Maximum recording time: 30 minutes</li>
          <li>• You can pause and resume recording if needed</li>
        </ul>
      </div>
    </div>
  );
};

export default AudioRecorder; 