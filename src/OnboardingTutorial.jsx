import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, Building2, Users, Filter, Mail, Sparkles } from 'lucide-react';

export function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to SmartCOI!",
      content: "Let's take a quick tour to help you get started with automated COI tracking and compliance management for your properties.",
      icon: <Sparkles size={48} className="text-emerald-500" />,
      position: "center",
      highlight: null
    },
    {
      title: "Add Your Properties",
      content: "Start by adding your properties. Each property can have its own insurance requirements (GL, Auto, Workers Comp) and will track vendors separately.",
      icon: <Building2 size={48} className="text-purple-500" />,
      position: "top-left",
      highlight: "property-selector"
    },
    {
      title: "Upload COI Documents",
      content: "Upload vendor certificates of insurance. Our AI automatically extracts coverage details, expiration dates, and checks compliance against your property's requirements.",
      icon: <Upload size={48} className="text-emerald-500" />,
      position: "top-right",
      highlight: "upload-button"
    },
    {
      title: "Manage Your Vendors",
      content: "View all your vendors at a glance. See their compliance status, coverage amounts, expiration dates, and any issues that need attention.",
      icon: <Users size={48} className="text-blue-500" />,
      position: "center",
      highlight: "vendor-list"
    },
    {
      title: "Quick Filters",
      content: "Use the filter buttons to instantly view expired, expiring soon, non-compliant, or compliant vendors. Click on stat cards to filter too!",
      icon: <Filter size={48} className="text-amber-500" />,
      position: "top-left",
      highlight: "quick-filters"
    },
    {
      title: "Automated Follow-ups",
      content: "Enable automatic email reminders to vendors with expiring or non-compliant certificates. Set your reminder schedule in Settings and never chase paperwork again.",
      icon: <Mail size={48} className="text-red-500" />,
      position: "top-right",
      highlight: "settings-button"
    },
    {
      title: "You're All Set!",
      content: "Start by adding a property, then upload your first COI. SmartCOI will handle the rest - tracking expirations, checking compliance, and following up with vendors.",
      icon: <CheckCircle size={48} className="text-emerald-500" />,
      position: "center",
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

  // Add highlight effect to target elements
  useEffect(() => {
    // Clear any existing highlights first
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
      el.style.position = '';
      el.style.zIndex = '';
      el.style.boxShadow = '';
      el.style.borderRadius = '';
    });

    if (currentStepData.highlight) {
      const element = document.querySelector(`[data-onboarding="${currentStepData.highlight}"]`);
      if (element) {
        element.classList.add('onboarding-highlight');
        element.style.position = 'relative';
        element.style.zIndex = '102';
        element.style.boxShadow = '0 0 0 4px rgba(16, 185, 129, 0.6), 0 0 20px rgba(16, 185, 129, 0.4)';
        element.style.borderRadius = '8px';
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Cleanup on unmount
    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
        el.style.position = '';
        el.style.zIndex = '';
        el.style.boxShadow = '';
        el.style.borderRadius = '';
      });
    };
  }, [currentStep, currentStepData.highlight]);

  // Position modal based on step
  const getPositionClasses = () => {
    switch (currentStepData.position) {
      case 'top-right':
        return 'items-start justify-end pt-24 pr-8';
      case 'top-left':
        return 'items-start justify-start pt-24 pl-8';
      default:
        return 'items-center justify-center';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
        onClick={onSkip}
      />

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-[101] flex ${getPositionClasses()} p-4 pointer-events-none`}>
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 pointer-events-auto border border-gray-200">
          {/* Close Button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Skip Tutorial"
          >
            <X size={20} />
          </button>

          {/* Step indicator */}
          <div className="text-xs text-gray-400 mb-4">
            Step {currentStep + 1} of {steps.length}
          </div>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center">
              {currentStepData.icon}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
            {currentStepData.title}
          </h2>

          {/* Content */}
          <p className="text-gray-600 text-center mb-6 text-sm leading-relaxed">
            {currentStepData.content}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-1.5 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-1.5 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                  index === currentStep
                    ? 'w-6 bg-emerald-500'
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
              className={`px-3 py-2 flex items-center space-x-1.5 rounded-lg text-sm transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={16} />
              <span>Back</span>
            </button>

            <button
              onClick={handleNext}
              className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-medium flex items-center space-x-2 shadow-lg shadow-emerald-500/25 transition-all text-sm"
            >
              <span>{isLastStep ? "Get Started" : "Next"}</span>
              {isLastStep ? (
                <CheckCircle size={16} />
              ) : (
                <ArrowRight size={16} />
              )}
            </button>
          </div>

          {/* Skip link */}
          {!isLastStep && (
            <div className="text-center mt-4">
              <button
                onClick={onSkip}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Skip tutorial
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
