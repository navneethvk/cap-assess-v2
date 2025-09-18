import React from 'react';

const AwaitingReview: React.FC = () => {
  return (
    <div className="hero min-h-screen bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-md">
          <h1 className="text-5xl font-bold">Awaiting Review</h1>
          <p className="py-6">
            Your account is currently awaiting review by an administrator.
            You will gain full access once your role has been approved.
          </p>
          <p className="text-sm text-gray-500">
            Please check back later.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AwaitingReview;
