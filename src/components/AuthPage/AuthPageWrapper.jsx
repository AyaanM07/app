const AuthPageWrapper = ({ children }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4">
      {children}
    </div>
  );
};

export default AuthPageWrapper;