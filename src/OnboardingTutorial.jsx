import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ArrowLeft, CheckCircle, Upload, Settings as SettingsIcon, BarChart3, Bell } from 'lucide-react';

export function OnboardingTutorial({ onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: "Welcome to SmartCOI!",
      content: "Let's take a quick tour to help you get started with automated COI tracking and compliance management.",
      icon: <CheckCircle size={48} className="text-green-500" />,
      position: "center",
      highlight: null
    },
    {
      title: "Configure Your Requirements",
      content: "Click the Settings button to set up your company name and insurance requirements. This helps SmartCOI automatically check vendor compliance.",
      icon: <SettingsIcon size={48} className="text-blue-500" />,
      position: "top-right",
      highlight: "settings-button"
    },
    {
      title: "Upload COI Documents",
      content: "Use the Upload COI button to add vendor certificates. Our AI automatically extracts all the data and checks compliance against your requirements.",
      icon: <Upload size={48} className="text-green-500" />,
      position: "top-right",
      highlight: "upload-button"
    },
    {
      title: "Quick Filter Buttons",
      content: "Use these filter buttons to instantly view expired vendors, expiring soon, non-compliant, or all vendors at once.",
      icon: <CheckCircle size={48} className="text-purple-500" />,
      position: "top-left",
      highlight: "quick-filters"
    },
    {
      title: "Analytics Dashboard",
      content: "View detailed analytics including compliance rates, risk scores, and expiration timelines. Track your portfolio health at a glance.",
      icon: <BarChart3 size={48} className="text-emerald-500" />,
      position: "center",
      highlight: "analytics-button"
    },
    {
      title: "Email Notifications",
      content: "Set up automatic email alerts for expiring or non-compliant vendors. Never miss a renewal deadline again.",
      icon: <Bell size={48} className="text-amber-500" />,
      position: "top-right",
      highlight: "notifications-button"
    },
    {
      title: "You're All Set!",
      content: "You now know the basics of SmartCOI. Start by configuring your settings, then upload your first COI to see the magic happen.",
      icon: <CheckCircle size={48} className="text-green-500" />,
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
        element.style.boxShadow = '0 0 0 4px rgba(34, 197, 94, 0.6), 0 0 20px rgba(34, 197, 94, 0.4)';
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
        return 'items-start justify-start pt-32 pl-8';
      default:
        return 'items-center justify-center';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-70 z-[100]"
        onClick={onSkip}
      />

      {/* Tutorial Modal */}
      <div className={`fixed inset-0 z-[101] flex ${getPositionClasses()} p-4 pointer-events-none`}>
        <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 pointer-events-auto">
          {/* Close Button */}
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            title="Exit Tutorial"
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
          <div className="flex justify-center space-x-2 mb-6">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                  index === currentStep
                    ? 'w-8 bg-green-500'
                    : index < currentStep
                    ? 'w-2 bg-green-300'
                    : 'w-2 bg-gray-300'
                }`}
                title={`Go to step ${index + 1}`}
              />
            ))}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center mb-4">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 flex items-center space-x-2 rounded-lg transition-colors ${
                currentStep === 0
                  ? 'text-gray-300 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <ArrowLeft size={20} />
              <span>Previous</span>
            </button>

            <button
              onClick={handleNext}
              className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium flex items-center space-x-2 shadow-lg transition-colors"
            >
              <span>{isLastStep ? "Get Started" : "Next"}</span>
              {isLastStep ? (
                <CheckCircle size={20} />
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          </div>

          {/* Exit Tutorial Link */}
          <div className="text-center border-t pt-4">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Exit Tutorial
            </button>
            <p className="text-xs text-gray-400 mt-1">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
