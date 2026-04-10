'use client';

interface ShopNowButtonProps {
  children: React.ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function ShopNowButton({
  children,
  className,
  ariaLabel,
}: ShopNowButtonProps) {
  const handleClick = () => {
    document.getElementById('todays-choice')?.scrollIntoView({
      behavior: 'smooth',
    });
  };

  return (
    <button onClick={handleClick} className={className} aria-label={ariaLabel}>
      {children}
    </button>
  );
}
