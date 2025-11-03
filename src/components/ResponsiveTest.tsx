import React from 'react';

const ResponsiveTest: React.FC = () => {
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white px-3 py-2 rounded-lg text-sm font-mono z-50">
      <div className="sm:hidden">xs</div>
      <div className="hidden sm:block md:hidden">sm</div>
      <div className="hidden md:block lg:hidden">md</div>
      <div className="hidden lg:block xl:hidden">lg</div>
      <div className="hidden xl:block 2xl:hidden">xl</div>
      <div className="hidden 2xl:block">2xl</div>
    </div>
  );
};

export default ResponsiveTest;
