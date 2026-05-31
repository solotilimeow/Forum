import { getRoleBadgeStyle, getRoleLabel } from '@/lib/security';

interface RoleBadgeProps {
  role: string;
  size?: 'sm' | 'md';
}

export default function RoleBadge({ role, size = 'sm' }: RoleBadgeProps) {
  const sizeClasses = size === 'sm' 
    ? 'text-xs px-2 py-0.5' 
    : 'text-sm px-3 py-1';
  
  return (
    <span className={`inline-block rounded-full font-medium border ${getRoleBadgeStyle(role)} ${sizeClasses}`}>
      {getRoleLabel(role)}
    </span>
  );
}
