import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Booking } from '@/services/bookings-service';
import {
  bookingOperationsService,
  EVENT_PROGRESS_STAGES,
} from '@/services/booking-operations-service';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/utils/cn';

interface BookingProgressSectionProps {
  booking: Booking;
}

export function BookingProgressSection({ booking }: BookingProgressSectionProps) {
  const queryClient = useQueryClient();
  const canUpdate = useAuthStore((s) => s.hasPermission('bookings.update'));

  const progressQuery = useQuery({
    queryKey: ['bookings', booking.id, 'progress'],
    queryFn: () => bookingOperationsService.getProgress(booking.id),
  });

  const updateMutation = useMutation({
    mutationFn: (stage: string) => bookingOperationsService.updateProgress(booking.id, stage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'progress'] });
      queryClient.invalidateQueries({ queryKey: ['bookings', booking.id, 'activities'] });
    },
  });

  if (progressQuery.isLoading) {
    return <p className="text-sm text-gray-500">Loading progress...</p>;
  }

  const progress = progressQuery.data;
  if (!progress) return null;

  const currentIndex = progress.stages.findIndex((s) => s.stage === progress.currentStage);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500">Current Stage</p>
        <p className="mt-1 font-display text-lg font-semibold text-gold">
          {progress.currentStageLabel}
        </p>
      </div>

      <div className="relative">
        <div className="absolute left-4 top-0 h-full w-0.5 bg-surface-border" />
        <div className="space-y-4">
          {progress.stages.map((stage, index) => {
            const isCurrent = stage.stage === progress.currentStage;
            const isCompleted = index <= currentIndex;
            return (
              <div key={stage.stage} className="relative flex items-start gap-4 pl-10">
                <span
                  className={cn(
                    'absolute left-2.5 top-1.5 h-3 w-3 rounded-full border-2 transition-all',
                    isCompleted
                      ? 'border-gold bg-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]'
                      : 'border-gray-600 bg-surface-elevated',
                    isCurrent && 'animate-pulse',
                  )}
                />
                <div className="flex-1">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      isCompleted ? 'text-gray-100' : 'text-gray-500',
                    )}
                  >
                    {stage.label}
                  </p>
                  {canUpdate && (
                    <button
                      type="button"
                      className="mt-1 text-xs text-gold hover:underline"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate(stage.stage)}
                    >
                      Set as current
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {canUpdate && (
        <select
          className="input-field max-w-xs"
          value={progress.currentStage}
          onChange={(event) => updateMutation.mutate(event.target.value)}
        >
          {EVENT_PROGRESS_STAGES.map((stage) => (
            <option key={stage.value} value={stage.value}>
              {stage.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
