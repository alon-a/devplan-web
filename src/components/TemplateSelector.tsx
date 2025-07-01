import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  avatar_url: string;
  voice_id: string;
  is_active: boolean;
  metadata?: {
    mood_profile?: string[];
    intensity_level?: 'low' | 'medium' | 'high';
    therapeutic_focus?: string[];
    preview_url?: string;
  };
}

interface TemplateSuggestion {
  templateId: string;
  confidence: number;
  reasoning: string;
  fallbackUsed: boolean;
}

interface TemplateSelectorProps {
  dialogueId: string;
  onTemplateSelect: (templateId: string) => void;
  onError: (error: string) => void;
  className?: string;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  dialogueId,
  onTemplateSelect,
  onError,
  className = ''
}) => {
  const { token } = useAuthStore();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [suggestion, setSuggestion] = useState<TemplateSuggestion | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplatesAndSuggestion();
  }, [dialogueId]);

  const fetchTemplatesAndSuggestion = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch templates and suggestion in parallel
      const [templatesResponse, suggestionResponse] = await Promise.all([
        fetch('/api/templates', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`/api/templates/suggest/${dialogueId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      if (!templatesResponse.ok) {
        throw new Error('Failed to fetch templates');
      }

      if (!suggestionResponse.ok) {
        throw new Error('Failed to fetch template suggestion');
      }

      const templatesData = await templatesResponse.json();
      const suggestionData = await suggestionResponse.json();

      setTemplates(templatesData.templates);
      setSuggestion(suggestionData.suggestion);
      setSelectedTemplateId(suggestionData.suggestion.templateId);

      // Notify parent of initial selection
      onTemplateSelect(suggestionData.suggestion.templateId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    onTemplateSelect(templateId);
  };

  const getTemplateCardClass = (templateId: string) => {
    const baseClass = 'relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md';
    const isSelected = templateId === selectedTemplateId;
    const isSuggested = suggestion && templateId === suggestion.templateId;

    if (isSelected && isSuggested) {
      return `${baseClass} border-blue-500 bg-blue-50 shadow-md`;
    } else if (isSelected) {
      return `${baseClass} border-green-500 bg-green-50 shadow-md`;
    } else if (isSuggested) {
      return `${baseClass} border-blue-300 bg-blue-25`;
    } else {
      return `${baseClass} border-gray-200 bg-white hover:border-gray-300`;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="mb-4">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 border rounded-lg">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-20 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-600 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <p className="text-lg font-semibold">Failed to Load Templates</p>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchTemplatesAndSuggestion}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-gray-500 mb-4">
          <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-lg font-semibold">No Templates Available</p>
        </div>
        <p className="text-gray-600">No psychological templates are currently available.</p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Choose Your Therapeutic Avatar
        </h3>
        <p className="text-gray-600">
          Select a psychological template that best matches your needs. 
          {suggestion && (
            <span className="ml-1">
              We've suggested one based on your mood analysis.
            </span>
          )}
        </p>
      </div>

      {/* Suggestion Info */}
      {suggestion && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-blue-800">
                Suggested Template
              </h4>
              <div className="mt-1 text-sm text-blue-700">
                <p className="mb-1">{suggestion.reasoning}</p>
                <p className="flex items-center">
                  <span className="mr-2">Confidence:</span>
                  <span className={`font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                    {Math.round(suggestion.confidence * 100)}%
                  </span>
                </p>
                {suggestion.fallbackUsed && (
                  <p className="text-blue-600 text-xs mt-1">
                    ⚠️ Using fallback template due to analysis limitations
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={getTemplateCardClass(template.id)}
            onClick={() => handleTemplateSelect(template.id)}
          >
            {/* Selection Indicator */}
            {template.id === selectedTemplateId && (
              <div className="absolute top-2 right-2">
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}

            {/* Suggested Badge */}
            {suggestion && template.id === suggestion.templateId && template.id !== selectedTemplateId && (
              <div className="absolute top-2 right-2">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Suggested
                </span>
              </div>
            )}

            {/* Avatar Preview */}
            <div className="mb-3">
              <div className="w-full h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                {template.avatar_url ? (
                  <img
                    src={template.avatar_url}
                    alt={template.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.nextElementSibling!.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div className={`w-full h-full flex items-center justify-center text-gray-400 ${template.avatar_url ? 'hidden' : ''}`}>
                  <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Template Info */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">{template.description}</p>
              
              {/* Category Badge */}
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {template.category}
                </span>
                
                {/* Therapeutic Focus */}
                {template.metadata?.therapeutic_focus && template.metadata.therapeutic_focus.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {template.metadata.therapeutic_focus[0]}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selection Summary */}
      {selectedTemplateId && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">Selected Template</h4>
              <p className="text-sm text-gray-600">
                {templates.find(t => t.id === selectedTemplateId)?.name}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">
                {suggestion && selectedTemplateId === suggestion.templateId
                  ? 'Based on your mood analysis'
                  : 'Custom selection'
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateSelector; 