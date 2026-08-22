import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, Save, Shield } from 'lucide-react';
import { RoleDetail, RoleSummary, rolesService } from '@/services/roles-service';
import { useAuthStore } from '@/stores/auth-store';
import { getApiErrorMessage } from '@/utils/api-error';
import { cn } from '@/utils/cn';
import { settingsBoxTone } from '@/components/settings/settings-visual';

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
    <div className="dhara-set-roles-layout">
      <section className={cn('dhara-set-panel', settingsBoxTone(8))}>
        <h3 className="dhara-set-section-title">Roles</h3>
        {rolesQuery.isLoading ? (
          <p className="dhara-set-note">Loading roles...</p>
        ) : rolesQuery.isError ? (
          <div className="dhara-set-error">
            <Shield />
            <p>Failed to load roles.</p>
          </div>
        ) : (
          <div className="dhara-set-role-list">
            {roles.map((role: RoleSummary, index) => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRoleId(role.id)}
                className={cn('dhara-set-nav-btn', settingsBoxTone(index), selectedRoleId === role.id && 'is-on')}
                style={{ width: '100%' }}
              >
                <span className="dhara-set-icon">
                  {role.isEditable ? <Shield /> : <Lock />}
                </span>
                <span>
                  <strong style={{ display: 'block' }}>{role.name}</strong>
                  <em style={{ fontStyle: 'normal', color: '#ffe7b8', fontWeight: 700 }}>
                    {role.permissionCount} permission{role.permissionCount === 1 ? '' : 's'}
                    {role.description ? ` · ${role.description}` : ''}
                  </em>
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className={cn('dhara-set-panel', settingsBoxTone(9))}>
        {!selectedRoleId ? (
          <p className="dhara-set-note">Select a role to view permissions.</p>
        ) : roleDetailQuery.isLoading ? (
          <p className="dhara-set-note">Loading permissions...</p>
        ) : roleDetailQuery.isError ? (
          <div className="dhara-set-error">
            <Shield />
            <p>Failed to load role permissions.</p>
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
      </section>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="dhara-set-section-title" style={{ margin: 0 }}>
              {role.name}
            </h3>
            {!role.isEditable && <span className="dhara-set-pill is-amber">Locked</span>}
          </div>
          <p className="dhara-set-note">
            {role.isEditable
              ? 'Enable or disable module permissions for this role.'
              : 'Owner role permissions are fixed and cannot be changed.'}
          </p>
        </div>
        {canManage && role.isEditable && (
          <div className="flex gap-2">
            <button type="button" className="dhara-set-btn" disabled={!isDirty || isSaving} onClick={onReset}>
              Reset
            </button>
            <button
              type="button"
              className="dhara-set-btn is-gold"
              disabled={!isDirty || isSaving}
              onClick={onSave}
            >
              <Save />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-5">
        {role.permissionGroups.map((group, index) => {
          const grantedInGroup = group.permissions.filter((permission) =>
            draftCodes.has(permission.code),
          ).length;
          const allGranted =
            group.permissions.length > 0 && grantedInGroup === group.permissions.length;
          const note = GROUP_NOTES[group.group];

          return (
            <section key={group.group} className={cn('dhara-set-fact', settingsBoxTone(index))}>
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h4 className="dhara-set-name">{group.group}</h4>
                  {note && <p className="dhara-set-note" style={{ marginTop: '0.25rem' }}>{note}</p>}
                </div>
                {!readOnly && group.permissions.length > 0 && (
                  <button
                    type="button"
                    className="dhara-set-link"
                    onClick={() => onToggleGroup(group.permissions, !allGranted)}
                  >
                    {allGranted ? 'Disable all' : 'Enable all'}
                  </button>
                )}
              </div>

              {group.permissions.length === 0 ? (
                <p className="dhara-set-note">No direct permissions in this group.</p>
              ) : (
                <div className="dhara-set-perm-grid">
                  {group.permissions.map((permission) => {
                    const checked = draftCodes.has(permission.code);
                    return (
                      <label key={permission.code} className="dhara-set-check">
                        <div>
                          <p className="dhara-set-name">{permission.label}</p>
                          <p className="dhara-set-gear-meta">{permission.code}</p>
                        </div>
                        <input
                          type="checkbox"
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
