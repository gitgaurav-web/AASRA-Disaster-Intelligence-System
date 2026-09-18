export default function Logo({ className = 'w-6 h-6', variant = 'dark' }) {
  return (
    <img
      src="/aasra-logo.png"
      alt="AASRA Logo"
      className={`${className} object-contain inline-block flex-shrink-0 select-none`}
      onError={(e) => {
        e.currentTarget.src = '/aasra-logo-original.png';
      }}
    />
  );
}
