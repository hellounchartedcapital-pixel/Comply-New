import React, { useState, useEffect, useCallback } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, Building2, Users, Filter, Mail, Sparkles } from 'lucide-react';

export function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState(null);

  const steps = [
    {
      title: "Welcome to SmartCOI!",
      content: "Let's take a quick tour to help you get started with automated COI tracking and compliance management for your properties.",
      icon: <Sparkles size={40} className="text-emerald-500" />,
      highlight: null
    },
    {
      title: "Add Your Properties",
      content: "Start by adding your properties. Each property can have its own insurance requirements (GL, Auto, Workers Comp) and will track vendors separately.",
      icon: <Building2 size={40} className="text-purple-500" />,
      highlight: "property-selector"
    },
    {
      title: "Upload COI Documents",
      content: "Upload vendor certificates of insurance. Our AI automatically extracts coverage details, expiration dates, and checks compliance against your property's requirements.",
      icon: <Upload size={40} className="text-emerald-500" />,
      highlight: "upload-button"
    },
    {
      title: "Manage Your Vendors",
      content: "View all your vendors at a glance. See their compliance status, coverage amounts, expiration dates, and any issues that need attention.",
      icon: <Users size={40} className="text-blue-500" />,
      highlight: "vendor-list"
    },
    {
      title: "Quick Filters",
      content: "Use the filter buttons to instantly view expired, expiring soon, non-compliant, or compliant vendors. Click on stat cards to filter too!",
      icon: <Filter size={40} className="text-amber-500" />,
      highlight: "quick-filters"
    },
    {
      title: "Automated Follow-ups",
      content: "Enable automatic email reminders to vendors with expiring or non-compliant certificates. Set your reminder schedule in Settings and never chase paperwork again.",
      icon: <Mail size={40} className="text-red-500" />,
      highlight: "settings-button"
    },
    {
      title: "You're All Set!",
      content: "Start by adding a property, then upload your first COI. SmartCOI will handle the rest - tracking expirations, checking compliance, and following up with vendors.",
      icon: <CheckCircle size={40} className="text-emerald-500" />,
      highlight: null
    }
  ];

  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (!isLastStep) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Get element position for spotlight
  const updateHighlightPosition = useCallback(() => {
    if (currentStepData.highlight) {
      const element = document.querySelector(`[data-onboarding="${currentStepData.highlight}"]`);
      if (element) {
        const rect = element.getBoundingClientRect();
        const padding = 8;
        setHighlightRect({
          top: rect.top - padding,
          left: rect.left - padding,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          elementTop: rect.top,
          elementLeft: rect.left,
          elementWidth: rect.width,
          elementHeight: rect.height
        });
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        setHighlightRect(null);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStepData.highlight]);

  useEffect(() => {
    updateHighlightPosition();
    window.addEventListener('resize', updateHighlightPosition);
    window.addEventListener('scroll', updateHighlightPosition);

    return () => {
      window.removeEventListener('resize', updateHighlightPosition);
      window.removeEventListener('scroll', updateHighlightPosition);
    };
  }, [currentStep, updateHighlightPosition]);

  // Calculate modal position based on highlighted element
  const getModalStyle = () => {
    if (!highlightRect) {
      // Center modal when no highlight
      return {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const modalWidth = 380;
    const modalHeight = 320;
    const margin = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Determine best position for modal relative to highlighted element
    const spaceAbove = highlightRect.top;
    const spaceLeft = highlightRect.left;
    const spaceRight = viewportWidth - (highlightRect.left + highlightRect.width);

    let top, left;

    // For elements at the top (header elements), position modal below
    if (highlightRect.top < 150) {
      top = highlightRect.top + highlightRect.height + margin;
      left = Math.min(
        Math.max(margin, highlightRect.left + highlightRect.width / 2 - modalWidth / 2),
        viewportWidth - modalWidth - margin
      );
    }
    // For elements in the middle/bottom, position modal above or to the side
    else if (spaceAbove > modalHeight + margin) {
      top = highlightRect.top - modalHeight - margin;
      left = Math.min(
        Math.max(margin, highlightRect.left + highlightRect.width / 2 - modalWidth / 2),
        viewportWidth - modalWidth - margin
      );
    }
    // Position to the right if more space there
    else if (spaceRight > modalWidth + margin) {
      top = Math.min(
        Math.max(margin, highlightRect.top + highlightRect.height / 2 - modalHeight / 2),
        viewportHeight - modalHeight - margin
      );
      left = highlightRect.left + highlightRect.width + margin;
    }
    // Position to the left
    else if (spaceLeft > modalWidth + margin) {
      top = Math.min(
        Math.max(margin, highlightRect.top + highlightRect.height / 2 - modalHeight / 2),
        viewportHeight - modalHeight - margin
      );
      left = highlightRect.left - modalWidth - margin;
    }
    // Default: below
    else {
      top = Math.min(highlightRect.top + highlightRect.height + margin, viewportHeight - modalHeight - margin);
      left = Math.min(
        Math.max(margin, highlightRect.left),
        viewportWidth - modalWidth - margin
      );
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`
    };
  };

  return (
    <>
      {/* Dark overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[100] pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              {highlightRect && (
                <rect
                  x={highlightRect.left}
                  y={highlightRect.top}
                  width={highlightRect.width}
                  height={highlightRect.height}
                  rx="12"
                  fill="black"
                />
              )}
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="rgba(0, 0, 0, 0.75)"
            mask="url(#spotlight-mask)"
          />
        </svg>
      </div>

      {/* Clickable overlay (closes tutorial) */}
      <div
        className="fixed inset-0 z-[100]"
        onClick={onSkip}
        style={{
          background: 'transparent'
        }}
      />

      {/* Highlight ring around element */}
      {highlightRect && (
        <div
          className="fixed z-[101] pointer-events-none rounded-xl"
          style={{
            top: highlightRect.top,
            left: highlightRect.left,
            width: highlightRect.width,
            height: highlightRect.height,
            boxShadow: '0 0 0 3px #10b981, 0 0 20px rgba(16, 185, 129, 0.5)',
          }}
        />
      )}

      {/* Tutorial Modal */}
      <div
        className="z-[102] bg-white rounded-2xl shadow-2xl w-[380px] p-5 border border-gray-200"
        style={getModalStyle()}
      >
        {/* Close Button */}
        <button
          onClick={onSkip}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
          title="Skip Tutorial"
        >
          <X size={18} />
        </button>

        {/* Step indicator */}
        <div className="text-xs text-gray-400 mb-3">
          Step {currentStep + 1} of {steps.length}
        </div>

        {/* Icon */}
        <div className="flex justify-center mb-3">
          <div className="w-16 h-16 rounded-xl bg-gray-50 flex items-center justify-center">
            {currentStepData.icon}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 text-center mb-2">
          {currentStepData.title}
        </h2>

        {/* Content */}
        <p className="text-gray-600 text-center mb-5 text-sm leading-relaxed">
          {currentStepData.content}
        </p>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-1.5 mb-5">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`h-1.5 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                index === currentStep
                  ? 'w-5 bg-emerald-500'
                  : index < currentStep
                  ? 'w-1.5 bg-emerald-300'
                  : 'w-1.5 bg-gray-200'
              }`}
              title={`Go to step ${index + 1}`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className={`px-3 py-2 flex items-center space-x-1 rounded-lg text-sm transition-colors ${
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <button
            onClick={handleNext}
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center space-x-1.5 shadow-lg shadow-emerald-500/25 transition-all text-sm"
          >
            <span>{isLastStep ? "Get Started" : "Next"}</span>
            {isLastStep ? (
              <CheckCircle size={14} />
            ) : (
              <ArrowRight size={14} />
            )}
          </button>
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <div className="text-center mt-3">
            <button
              onClick={onSkip}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip tutorial
            </button>
          </div>
        )}
      </div>
    </>
  );
}
