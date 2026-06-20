import { inferTaskVisual } from '../../lib/taskVisuals';
import type { TaskTemplate } from '../../lib/types';

type TaskVisualProps = {
  template?: Pick<TaskTemplate, 'name' | 'category' | 'task_type' | 'icon' | 'image_url'> | null;
  icon?: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const SIZE_CLASSES = {
  sm: 'w-8 h-8 rounded-lg text-base p-1',
  md: 'w-11 h-11 rounded-xl text-xl p-1.5',
  lg: 'w-16 h-16 rounded-2xl text-3xl p-2',
  xl: 'w-24 h-24 rounded-3xl text-6xl p-2.5',
};

export function TaskVisual({ template, icon, imageUrl, size = 'md', className = '' }: TaskVisualProps) {
  const inferred = inferTaskVisual(template?.name, template?.category);
  const finalIcon = icon || template?.icon || inferred.icon;
  const finalImage = imageUrl || template?.image_url || inferred.imageUrl;

  return (
    <div className={`flex items-center justify-center bg-white/80 overflow-hidden shadow-sm ${SIZE_CLASSES[size]} ${className}`}>
      {finalImage ? (
        <img
          src={finalImage}
          alt=""
          className="w-full h-full object-contain"
          draggable={false}
        />
      ) : (
        <span aria-hidden="true">{finalIcon}</span>
      )}
    </div>
  );
}
