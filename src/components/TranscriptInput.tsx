import React, { useState, useEffect } from 'react';
import { FileText, Languages, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface TranscriptInputProps {
  onSuccess: (dialogue: any) => void;
  register: any;
  errors: any;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const TranscriptInput: React.FC<TranscriptInputProps> = ({
  onSuccess,
  register,
  errors,
  isSubmitting,
  onSubmit
}) => {
  const [content, setContent] = useState('');
  const [detectedLanguage, setDetectedLanguage] = useState<'english' | 'hebrew' | 'unsupported' | null>(null);
  const [isDetectingLanguage, setIsDetectingLanguage] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  const maxCharacters = 10000; // 10k character limit
  const minWords = 10; // Minimum 10 words

  useEffect(() => {
    // Update counts when content changes
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    setWordCount(words.length);
    setCharacterCount(content.length);

    // Auto-detect language when content changes (debounced)
    const timeoutId = setTimeout(() => {
      if (content.trim().length > 0) {
        detectLanguage(content);
      } else {
        setDetectedLanguage(null);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [content]);

  const detectLanguage = async (text: string) => {
    if (text.trim().length === 0) return;

    setIsDetectingLanguage(true);
    try {
      // Simple client-side language detection
      const hebrewPattern = /[\u0590-\u05FF]/;
      const englishPattern = /[a-zA-Z]/;
      
      if (hebrewPattern.test(text)) {
        setDetectedLanguage('hebrew');
      } else if (englishPattern.test(text)) {
        setDetectedLanguage('english');
      } else {
        setDetectedLanguage('unsupported');
      }
    } catch (error) {
      console.error('Language detection error:', error);
      setDetectedLanguage('unsupported');
    } finally {
      setIsDetectingLanguage(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (newContent.length <= maxCharacters) {
      setContent(newContent);
    }
  };

  const getLanguageIcon = () => {
    if (isDetectingLanguage) {
      return <Loader className="w-4 h-4 animate-spin" />;
    }
    
    switch (detectedLanguage) {
      case 'english':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'hebrew':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unsupported':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Languages className="w-4 h-4 text-gray-400" />;
    }
  };

  const getLanguageText = () => {
    if (isDetectingLanguage) {
      return 'Detecting language...';
    }
    
    switch (detectedLanguage) {
      case 'english':
        return 'English detected';
      case 'hebrew':
        return 'Hebrew detected';
      case 'unsupported':
        return 'Unsupported language';
      default:
        return 'Language not detected';
    }
  };

  const isContentValid = () => {
    return content.trim().length > 0 && 
           wordCount >= minWords && 
           detectedLanguage !== 'unsupported';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isContentValid()) {
      if (content.trim().length === 0) {
        toast.error('Please enter your transcript');
      } else if (wordCount < minWords) {
        toast.error(`Transcript must be at least ${minWords} words`);
      } else if (detectedLanguage === 'unsupported') {
        toast.error('Please provide text in English or Hebrew');
      }
      return;
    }

    onSubmit(e);
  };

  return (
    <div className="space-y-6">
      {/* Language Detection Status */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-2">
          {getLanguageIcon()}
          <span className="text-sm font-medium text-gray-700">
            {getLanguageText()}
          </span>
        </div>
        
        <div className="text-sm text-gray-500">
          {wordCount} words • {characterCount}/{maxCharacters} characters
        </div>
      </div>

      {/* Content Input */}
      <div>
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
          Transcript Content *
        </label>
        <textarea
          id="content"
          {...register('content', { 
            required: 'Transcript content is required',
            minLength: { value: minWords, message: `Transcript must be at least ${minWords} words` }
          })}
          value={content}
          onChange={handleContentChange}
          className="textarea w-full h-64 resize-none"
          placeholder="Paste or type your transcript here...
          
Example:
Hello, I wanted to share my thoughts about the recent changes in our project. I think we need to reconsider our approach and maybe take a step back to evaluate our priorities..."
        />
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
        )}
      </div>

      {/* Validation Messages */}
      <div className="space-y-2">
        {content.trim().length > 0 && wordCount < minWords && (
          <div className="flex items-center text-sm text-amber-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            Transcript must be at least {minWords} words (currently {wordCount})
          </div>
        )}
        
        {detectedLanguage === 'unsupported' && content.trim().length > 0 && (
          <div className="flex items-center text-sm text-red-600">
            <AlertCircle className="w-4 h-4 mr-2" />
            Please provide text in English or Hebrew
          </div>
        )}
        
        {isContentValid() && (
          <div className="flex items-center text-sm text-green-600">
            <CheckCircle className="w-4 h-4 mr-2" />
            Transcript is ready for submission
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          onClick={handleSubmit}
          disabled={isSubmitting || !isContentValid()}
          className="btn-primary flex items-center"
        >
          {isSubmitting ? (
            <>
              <Loader className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Submit Transcript
            </>
          )}
        </button>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">Transcript Guidelines:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Minimum {minWords} words required</li>
          <li>• Maximum {maxCharacters.toLocaleString()} characters</li>
          <li>• Supported languages: English and Hebrew</li>
          <li>• Include punctuation and proper formatting</li>
          <li>• For best results, include natural speech patterns</li>
        </ul>
      </div>

      {/* Language Support Info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Language Support:</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h5 className="font-medium text-gray-700 mb-1">English</h5>
            <p>Full support for English transcripts with advanced mood analysis and natural speech synthesis.</p>
          </div>
          <div>
            <h5 className="font-medium text-gray-700 mb-1">Hebrew</h5>
            <p>Complete Hebrew language support including right-to-left text processing and Hebrew voice synthesis.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TranscriptInput; 