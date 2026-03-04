interface BadgeProps {
  value: string;
  type?: 'status' | 'priority' | 'type';
}

const statusColors: Record<string, string> = {
  todo: 'bg-gray-100 text-gray-700',
  backlog: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  in_review: 'bg-purple-100 text-purple-700',
  done: 'bg-green-100 text-green-700',
  closed: 'bg-gray-200 text-gray-600',
  planning: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const typeColors: Record<string, string> = {
  task: 'bg-blue-100 text-blue-700',
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-purple-100 text-purple-700',
  improvement: 'bg-cyan-100 text-cyan-700',
  test: 'bg-yellow-100 text-yellow-700',
};

export default function Badge({ value, type = 'status' }: BadgeProps) {
  const colorMap = type === 'priority' ? priorityColors : type === 'type' ? typeColors : statusColors;
  const colorClass = colorMap[value] ?? 'bg-gray-100 text-gray-700';
  const label = value.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}
    >
      {label}
    </span>
  );
}