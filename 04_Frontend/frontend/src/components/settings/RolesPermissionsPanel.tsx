import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Save, Shield } from 'lucide-react';
import { RoleDetail, RoleSummary, rolesService } from '@/services/roles-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';

const GROUP_NOTES: Record<string, string> = {
  Bookings: 'Includes Calendar access.',
  Calendar: 'Calendar uses Bookings permissions (bookings.read and related).',
  Settings: 'Studio profile, master data, service rates, and activity log.',
  Packages: 'Package management uses Settings permissions (settings.read / settings.update).',
  Audit: 'Activity log visibility uses the Settings Read permission.',
};

interface RolesPermissionsPanelProps {
  onFeedback: (feedback: { type: 'success' | 'error'; message: string } | null) => void;
}

export function RolesPermissionsPanel({ onFeedback }: RolesPermissionsPanelProps) {
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const canManage = hasPermission('roles.manage');

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftCodes, setDraftCodes] = useState<Set<string>>(new Set());

  const rolesQuery = useQuery({
    queryKey: ['roles'],
    queryFn: rolesService.list,
  });

  const roleDetailQuery = useQuery({
    queryKey: ['roles', selectedRoleId],
    queryFn: () => rolesService.getById(selectedRoleId!),
    enabled: Boolean(selectedRoleId),
  });

  const roles = rolesQuery.data ?? [];

  useEffect(() => {
    if (!selectedRoleId && roles.length > 0) {
      setSelectedRoleId(roles[0].id);
    }
  }, [roles, selectedRoleId]);

  useEffect(() => {
    if (roleDetailQuery.data) {
      setDraftCodes(new Set(roleDetailQuery.data.grantedPermissionCodes));
    }
  }, [roleDetailQuery.data]);

  const saveMutation = useMutation({
    mutationFn: ({ roleId, permissionCodes }: { roleId: string; permissionCodes: string[] }) =>
      rolesService.updatePermissions(roleId, permissionCodes),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['roles'] });
      queryClient.setQueryData(['roles', updated.id], updated);
      onFeedback({
        type: 'success',
        message: `Permissions updated for ${updated.name}.`,
      });
    },
    onError: (error: unknown) => {
      onFeedback({
        type: 'error',
        message: getApiErrorMessage(error, 'Failed to update role permissions.'),
      });
    },
  });

  const selectedRole = roleDetailQuery.data;
  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const saved = new Set(selectedRole.grantedPermissionCodes);
    if (saved.size !== draftCodes.size) return true;
    for (const code of saved) {
      if (!draftCodes.has(code)) return true;
    }
    return false;
  }, [selectedRole, draftCodes]);

  const togglePermission = (code: string, granted: boolean) => {
    setDraftCodes((current) => {
      const next = new Set(current);
      if (granted) {
        next.add(code);
      } else {
        next.delete(code);
      }
      return next;
    });
  };

  const toggleGroup = (permissions: { code: string }[], grant: boolean) => {
    setDraftCodes((current) => {
      const next = new Set(current);
      for (const permission of permissions) {
        if (grant) {
          next.add(permission.code);
        } else {
          next.delete(permission.code);
        }
      }
      return next;
    });
  };

  const handleSave = () => {
    if (!selectedRoleId || !selectedRole?.isEditable) return;
    saveMutation.mutate({
      roleId: selectedRoleId,
      permissionCodes: Array.from(draftCodes).sort(),
    });
  };

  const handleReset = () => {
    if (selectedRole) {
      setDraftCodes(new Set(selectedRole.grantedPermissionCodes));
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="card h-fit">
        <h3 className="mb-4 font-display text-sm font-semibold uppercase tracking-wider text-gray-500">
          Roles
        </h3>
        {rolesQuery.isLoading ? (
          <div className="py-8 text-center text-sm text-gray-500">Loading roles...</div>
        ) : rolesQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-6 text-center text-sm text-red-400">
            Failed to load roles.
          </div>
        ) : (
          <div className="space-y-2">
            {roles.map((role: RoleSummary) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn(
                  'w-full rounded-lg border px-3 py-3 text-left transition',
                  selectedRoleId === role.id
                    ? 'border-gold/50 bg-gold/10'
                    : 'border-surface-border hover:border-gold/30 hover:bg-white/[0.02]',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-gold/80" />
                    <span className="font-medium text-gray-100">{role.name}</span>
                  </div>
                  {!role.isEditable && <Lock className="h-3.5 w-3.5 text-gray-500" />}
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {role.permissionCount} permission{role.permissionCount === 1 ? '' : 's'}
                  {role.description ? ` · ${role.description}` : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        {!selectedRoleId ? (
          <div className="py-12 text-center text-sm text-gray-500">Select a role to view permissions.</div>
        ) : roleDetailQuery.isLoading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading permissions...</div>
        ) : roleDetailQuery.isError ? (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-8 text-center text-red-400">
            Failed to load role permissions.
          </div>
        ) : selectedRole ? (
          <RolePermissionsEditor
            role={selectedRole}
            draftCodes={draftCodes}
            canManage={canManage}
            isDirty={isDirty}
            isSaving={saveMutation.isPending}
            onToggle={togglePermission}
            onToggleGroup={toggleGroup}
            onSave={handleSave}
            onReset={handleReset}
          />
        ) : null}
      </div>
    </div>
  );
}

interface RolePermissionsEditorProps {
  role: RoleDetail;
  draftCodes: Set<string>;
  canManage: boolean;
  isDirty: boolean;
  isSaving: boolean;
  onToggle: (code: string, granted: boolean) => void;
  onToggleGroup: (permissions: { code: string }[], grant: boolean) => void;
  onSave: () => void;
  onReset: () => void;
}

function RolePermissionsEditor({
  role,
  draftCodes,
  canManage,
  isDirty,
  isSaving,
  onToggle,
  onToggleGroup,
  onSave,
  onReset,
}: RolePermissionsEditorProps) {
  const readOnly = !canManage || !role.isEditable;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 border-b border-surface-border pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-lg font-semibold text-gold">{role.name}</h3>
            {!role.isEditable && (
              <span className="rounded-full bg-gray-500/10 px-2 py-0.5 text-xs text-gray-400">
                Locked
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {role.isEditable
              ? 'Enable or disable module permissions for this role.'
              : 'Owner role permissions are fixed and cannot be changed.'}
          </p>
        </div>
        {canManage && role.isEditable && (
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={!isDirty || isSaving}
              onClick={onReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="btn-primary inline-flex items-center"
              disabled={!isDirty || isSaving}
              onClick={onSave}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {role.permissionGroups.map((group) => {
          const grantedInGroup = group.permissions.filter((permission) =>
            draftCodes.has(permission.code),
          ).length;
          const allGranted =
            group.permissions.length > 0 && grantedInGroup === group.permissions.length;
          const note = GROUP_NOTES[group.group];

          return (
            <section
              key={group.group}
              className="rounded-lg border border-surface-border bg-white/[0.02] p-4"
            >
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="font-medium text-gray-100">{group.group}</h4>
                  {note && <p className="text-xs text-gray-500">{note}</p>}
                </div>
                {!readOnly && group.permissions.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-gold hover:underline"
                    onClick={() => onToggleGroup(group.permissions, !allGranted)}
                  >
                    {allGranted ? 'Disable all' : 'Enable all'}
                  </button>
                )}
              </div>

              {group.permissions.length === 0 ? (
                <p className="text-sm text-gray-500">No direct permissions in this group.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.permissions.map((permission) => {
                    const checked = draftCodes.has(permission.code);
                    return (
                      <label
                        key={permission.code}
                        className={cn(
                          'flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition',
                          checked
                            ? 'border-gold/30 bg-gold/5'
                            : 'border-surface-border/80 bg-transparent',
                          readOnly ? 'cursor-default' : 'cursor-pointer hover:border-gold/20',
                        )}
                      >
                        <div>
                          <p className="text-sm text-gray-100">{permission.label}</p>
                          <p className="font-mono text-xs text-gray-500">{permission.code}</p>
                        </div>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-surface-border bg-surface text-gold focus:ring-gold/40"
                          checked={checked}
                          disabled={readOnly}
                          onChange={(event) => onToggle(permission.code, event.target.checked)}
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
