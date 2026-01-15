import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, Settings as SettingsIcon, BarChart3, Bell } from 'lucide-react';

export function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showOverlay, setShowOverlay] = useState(true);

  const steps = [
    {
      title: "Welcome to SmartCOI! 🎉",
      content: "Let's take a quick tour to help you get started with automated COI tracking and compliance management.",
      icon: <CheckCircle size={48} className="text-green-500" />,
      position: "center",
      highlight: null
    },
    {
      title: "Configure Your Requirements",
      content: "First, click the Settings button to set up your company name and insurance requirements. This helps SmartCOI automatically check vendor compliance.",
      icon: <SettingsIcon size={48} className="text-blue-500" />,
      position: "top-right",
      highlight: "settings-button"
    },
    {
      title: "Upload COI Documents",
      content: "Use the Upload COI button to add vendor certificates. Our AI automatically extracts all data and checks compliance against your requirements!",
      icon: <Upload size={48} className="text-green-500" />,
      position: "top-right",
      highlight: "upload-button"
    },
    {
      title: "Quick Filter Buttons",
      content: "Use these quick filter buttons to instantly view expired vendors, expiring soon, non-compliant, or vendors missing required clauses.",
      icon: <CheckCircle size={48} className="text-purple-500" />,
      position: "top-left",
      highlight: "quick-filters"
    },
    {
      title: "Analytics Dashboard",
      content: "View detailed analytics including compliance rates, risk scores, and expiration timelines. Track your portfolio health at a glance!",
      icon: <BarChart3 size={48} className="text-emerald-500" />,
      position: "center",
      highlight: "analytics-button"
    },
    {
      title: "Email Notifications",
      content: "Set up automatic email alerts for expiring or non-compliant vendors. Never miss a renewal deadline again!",
      icon: <Bell size={48} className="text-amber-500" />,
      position: "top-right",
      highlight: "notifications-button"
    },
    {
      title: "You're All Set! 🚀",
      content: "You now know the basics of SmartCOI. Start by uploading your first COI or configuring your settings. Need help? Check the documentation or reach out to support!",
      icon: <CheckCircle size={48} className="text-green-500" />,
      position: "center",
      highlight: null
    }
  ];

  const currentStepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    setShowOverlay(false);
    onComplete();
  };

  const handleSkipTutorial = () => {
    setShowOverlay(false);
    onSkip();
  };

  // Add highlight effect to target elements
  useEffect(() => {
    if (currentStepData.highlight) {
      const element = document.querySelector(`[data-onboarding="${currentStepData.highlight}"]`);
      if (element) {
        element.classList.add('onboarding-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Cleanup highlights
    return () => {
      document.querySelectorAll('.onboarding-highlight').forEach(el => {
        el.classList.remove('onboarding-highlight');
      });
    };
  }, [currentStep, currentStepData.highlight]);

  if (!showOverlay) return null;

  // Position modal based on step
  const getPositionClasses = () => {
    if (currentStepData.position === 'center') {
      return 'items-center justify-center';
    } else if (currentStepData.position === 'top-right') {
      return 'items-start justify-end pt-24 pr-8';
    } else if (currentStepData.position === 'top-left') {
      return 'items-start justify-start pt-32 pl-8';
    }
    return 'items-center justify-center';
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-70 z-[100] transition-opacity" />

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-[101] flex ${getPositionClasses()} p-4 pointer-events-none`}>
        <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full p-8 pointer-events-auto animate-fade-in">
          {/* Close Button */}
          <button
            onClick={handleSkipTutorial}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            title="Skip Tutorial"
          >
            <X size={24} />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-6">
            {currentStepData.icon}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
            {currentStepData.title}
          </h2>

          {/* Content */}
          <p className="text-gray-600 text-center mb-8 leading-relaxed">
            {currentStepData.content}
          </p>

          {/* Progress Dots */}
          <div className="flex justify-center space-x-2 mb-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 rounded-full transition-all ${
                  index === currentStep
                    ? 'w-8 bg-green-500'
                    : index < currentStep
                    ? 'w-2 bg-green-300'
                    : 'w-2 bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center">
            {currentStep > 0 ? (
              <button
                onClick={handlePrevious}
                className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center space-x-2"
              >
                <ArrowLeft size={20} />
                <span>Previous</span>
              </button>
            ) : (
              <button
                onClick={handleSkipTutorial}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                Skip Tutorial
              </button>
            )}

            <button
              onClick={handleNext}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center space-x-2 shadow-lg"
            >
              <span>{currentStep === steps.length - 1 ? "Get Started" : "Next"}</span>
              {currentStep === steps.length - 1 ? (
                <CheckCircle size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>

          {/* Step Counter */}
          <p className="text-xs text-gray-400 text-center mt-6">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
      </div>

      {/* CSS for highlight effect */}
      <style jsx>{`
        .onboarding-highlight {
          position: relative;
          z-index: 102 !important;
          box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.5), 0 0 0 99999px rgba(0, 0, 0, 0.7) !important;
          border-radius: 8px;
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
