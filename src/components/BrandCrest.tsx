import React from 'react';
import { getVipPerks } from '../game/economy';

export const BrandCrest: React.FC<{ size?: number; className?: string }> = ({
  size = 40,
  className = '',
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="4" y="4" width="56" height="56" rx="16" fill="#E9F7DF" stroke="#15803D" strokeWidth="2.5" />
    {/* Sun */}
    <circle cx="46" cy="18" r="6" fill="#FBBF24" />
    {/* Rolling meadow hill */}
    <path d="M6 45C16 37 32 36 58 43V52C58 55.3137 55.3137 58 52 58H12C8.68629 58 6 55.3137 6 52V45Z" fill="#4ADE80" />
    <path d="M6 50C22 45 42 46 58 51V54C58 56.2091 56.2091 58 54 58H10C7.79086 58 6 56.2091 6 54V50Z" fill="#16A34A" />
    {/* Cozy Red Barn */}
    <path d="M16 31L27 21L38 31V44H16V31Z" fill="#EA580C" stroke="#7C2D12" strokeWidth="2" strokeLinejoin="round" />
    <path d="M13 32L27 19L41 32" stroke="#9A3412" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="23" y="34" width="8" height="10" rx="1" fill="#FEF3C7" stroke="#7C2D12" strokeWidth="1.5" />
    <path d="M23 34L31 44M31 34L23 44" stroke="#9A3412" strokeWidth="1.2" />
    {/* Wheat stalk accent */}
    <path d="M47 45V30" stroke="#D97706" strokeWidth="2.2" strokeLinecap="round" />
    <ellipse cx="44" cy="34" rx="2.5" ry="1.5" transform="rotate(-30 44 34)" fill="#F59E0B" />
    <ellipse cx="50" cy="33" rx="2.5" ry="1.5" transform="rotate(30 50 33)" fill="#F59E0B" />
    <ellipse cx="44" cy="39" rx="2.5" ry="1.5" transform="rotate(-30 44 39)" fill="#F59E0B" />
    <ellipse cx="50" cy="38" rx="2.5" ry="1.5" transform="rotate(30 50 38)" fill="#F59E0B" />
  </svg>
);

export const VipAvatarFrame: React.FC<{
  avatarEmoji: string;
  vipLevel: number;
  size?: 'sm' | 'md' | 'lg';
}> = ({ avatarEmoji, vipLevel, size = 'md' }) => {
  const perks = getVipPerks(vipLevel);
  const dim =
    size === 'sm'
      ? 'w-9 h-9 text-lg'
      : size === 'lg'
        ? 'w-14 h-14 text-3xl'
        : 'w-11 h-11 text-2xl';

  return (
    <div className="relative inline-flex shrink-0 items-center justify-center">
      <div
        className={`${dim} rounded-2xl ring-2 ${perks.frameRingClass} flex items-center justify-center shadow-sm select-none`}
        title={`VIP ${vipLevel} · ${perks.frameTitle}`}
      >
        <span role="img" aria-label="Avatar">
          {avatarEmoji}
        </span>
      </div>
      <span
        className={`absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono-num leading-none bg-white border border-slate-200 shadow-xs ${perks.badgeColorClass}`}
      >
        V{vipLevel}
      </span>
    </div>
  );
};
