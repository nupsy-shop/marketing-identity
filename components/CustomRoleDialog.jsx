'use client';

/**
 * Custom Role Management Dialog
 * Allows creating and managing custom roles beyond predefined templates
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { validateRoleName } from '@/lib/validation';

// Permission levels for different access types
const PERMISSION_LEVELS = {
  full: { label: 'Full Access', icon: 'fas fa-crown', color: 'text-amber-600', description: 'Complete control including admin functions' },
  standard: { label: 'Standard', icon: 'fas fa-user', color: 'text-blue-600', description: 'Normal user access with core features' },
  limited: { label: 'Limited', icon: 'fas fa-user-lock', color: 'text-gray-600', description: 'Restricted access with read-heavy permissions' },
  readonly: { label: 'Read Only', icon: 'fas fa-eye', color: 'text-green-600', description: 'View-only access, no modifications' },
};

// Common permission categories
const PERMISSION_CATEGORIES = [
  { key: 'campaigns', label: 'Campaign Management', icon: 'fas fa-bullhorn' },
  { key: 'reporting', label: 'Reporting & Analytics', icon: 'fas fa-chart-bar' },
  { key: 'billing', label: 'Billing & Payments', icon: 'fas fa-credit-card' },
  { key: 'users', label: 'User Management', icon: 'fas fa-users' },
  { key: 'settings', label: 'Account Settings', icon: 'fas fa-cog' },
  { key: 'api', label: 'API Access', icon: 'fas fa-code' },
];

export default function CustomRoleDialog({
  open,
  onOpenChange,
  platformName = 'Platform',
  existingRoles = [],
  onSaveRole,
  editingRole = null,
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [permissionLevel, setPermissionLevel] = useState('standard');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [errors, setErrors] = useState({});
  
  // Reset form when dialog opens/closes or editing role changes
  useEffect(() => {
    if (open) {
      if (editingRole) {
        setRoleName(editingRole.label || editingRole.key || '');
        setRoleDescription(editingRole.description || '');
        setPermissionLevel(editingRole.permissionLevel || 'standard');
        setSelectedPermissions(editingRole.permissions || []);
      } else {
        setRoleName('');
        setRoleDescription('');
        setPermissionLevel('standard');
        setSelectedPermissions([]);
      }
      setErrors({});
    }
  }, [open, editingRole]);
  
  const handlePermissionToggle = (permKey) => {
    setSelectedPermissions(prev => 
      prev.includes(permKey)
        ? prev.filter(p => p !== permKey)
        : [...prev, permKey]
    );
  };
  
  const validateForm = () => {
    const newErrors = {};
    
    // Validate role name
    const nameValidation = validateRoleName(roleName);
    if (!nameValidation.valid) {
      newErrors.roleName = nameValidation.errors[0];
    }
    
    // Check for duplicates (unless editing the same role)
    const isDuplicate = existingRoles.some(r => 
      r.key?.toLowerCase() === roleName.toLowerCase() ||
      r.label?.toLowerCase() === roleName.toLowerCase()
    );
    if (isDuplicate && !editingRole) {
      newErrors.roleName = 'A role with this name already exists';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const roleData = {
        key: roleName.toLowerCase().replace(/\s+/g, '-'),
        label: roleName,
        description: roleDescription,
        permissionLevel,
        permissions: selectedPermissions,
        isCustom: true,
        createdAt: editingRole?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      if (onSaveRole) {
        await onSaveRole(roleData, !!editingRole);
      }
      
      toast({
        title: editingRole ? 'Role Updated' : 'Role Created',
        description: `${roleName} has been ${editingRole ? 'updated' : 'created'} successfully.`,
      });
      
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <i className="fas fa-user-shield text-primary" aria-hidden="true"></i>
            {editingRole ? 'Edit Custom Role' : 'Create Custom Role'}
          </DialogTitle>
          <DialogDescription>
            Define a custom role for {platformName} with specific permissions.
            <a 
              href="https://support.google.com/google-ads/answer/9978556" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-2 text-primary hover:underline inline-flex items-center gap-1"
            >
              <i className="fas fa-external-link-alt text-xs" aria-hidden="true"></i>
              Learn about roles
            </a>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Role Name */}
          <div className="space-y-2">
            <Label htmlFor="role-name" className="flex items-center gap-2">
              Role Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="role-name"
              placeholder="e.g., Campaign Manager, Analytics Viewer"
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              className={errors.roleName ? 'border-destructive' : ''}
              aria-invalid={!!errors.roleName}
              aria-describedby={errors.roleName ? 'role-name-error' : undefined}
            />
            {errors.roleName && (
              <p id="role-name-error" className="text-sm text-destructive flex items-center gap-1">
                <i className="fas fa-exclamation-circle" aria-hidden="true"></i>
                {errors.roleName}
              </p>
            )}
          </div>
          
          {/* Role Description */}
          <div className="space-y-2">
            <Label htmlFor="role-description">Description (Optional)</Label>
            <Textarea
              id="role-description"
              placeholder="Describe what this role can do..."
              value={roleDescription}
              onChange={(e) => setRoleDescription(e.target.value)}
              rows={2}
            />
          </div>
          
          {/* Permission Level */}
          <div className="space-y-2">
            <Label htmlFor="permission-level">Permission Level</Label>
            <Select value={permissionLevel} onValueChange={setPermissionLevel}>
              <SelectTrigger id="permission-level">
                <SelectValue placeholder="Select permission level" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PERMISSION_LEVELS).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    <div className="flex items-center gap-2">
                      <i className={`${config.icon} ${config.color}`} aria-hidden="true"></i>
                      <span>{config.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {PERMISSION_LEVELS[permissionLevel]?.description}
            </p>
          </div>
          
          {/* Permission Categories */}
          <div className="space-y-3">
            <Label>Permission Categories</Label>
            <p className="text-sm text-muted-foreground">
              Select which areas this role should have access to
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {PERMISSION_CATEGORIES.map(perm => (
                <Tooltip key={perm.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handlePermissionToggle(perm.key)}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPermissions.includes(perm.key)
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      aria-pressed={selectedPermissions.includes(perm.key)}
                    >
                      <i className={perm.icon} aria-hidden="true"></i>
                      <span className="text-sm font-medium">{perm.label}</span>
                      {selectedPermissions.includes(perm.key) && (
                        <i className="fas fa-check ml-auto text-primary" aria-hidden="true"></i>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Click to {selectedPermissions.includes(perm.key) ? 'remove' : 'add'} {perm.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>
          
          {/* Preview */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <Label className="text-sm text-muted-foreground mb-2 block">Preview</Label>
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                <i className={`${PERMISSION_LEVELS[permissionLevel]?.icon} mr-2 ${PERMISSION_LEVELS[permissionLevel]?.color}`} aria-hidden="true"></i>
                {roleName || 'Role Name'}
              </Badge>
              {selectedPermissions.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {selectedPermissions.length} permission{selectedPermissions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {roleDescription && (
              <p className="text-sm text-muted-foreground mt-2">{roleDescription}</p>
            )}
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !roleName.trim()}>
            {saving ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Saving...
              </>
            ) : (
              <>
                <i className="fas fa-check mr-2" aria-hidden="true"></i>
                {editingRole ? 'Update Role' : 'Create Role'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Helper component for displaying roles with custom role indicator
export function RoleBadge({ role, onEdit, onDelete, showActions = false }) {
  return (
    <Badge 
      variant={role.isCustom ? 'default' : 'secondary'} 
      className={`px-3 py-1.5 ${role.isCustom ? 'bg-primary/10 text-primary border-primary/20' : ''}`}
    >
      <i className={`fas ${role.isCustom ? 'fa-user-shield' : 'fa-shield-halved'} mr-2 text-xs`} aria-hidden="true"></i>
      {role.label || role.key}
      {role.isCustom && (
        <span className="ml-2 text-xs opacity-70">(Custom)</span>
      )}
      {showActions && role.isCustom && (
        <span className="ml-2 flex gap-1">
          {onEdit && (
            <button 
              onClick={(e) => { e.stopPropagation(); onEdit(role); }}
              className="hover:text-primary"
              aria-label={`Edit ${role.label}`}
            >
              <i className="fas fa-pen text-xs" aria-hidden="true"></i>
            </button>
          )}
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(role); }}
              className="hover:text-destructive"
              aria-label={`Delete ${role.label}`}
            >
              <i className="fas fa-times text-xs" aria-hidden="true"></i>
            </button>
          )}
        </span>
      )}
      {role.description && !showActions && (
        <span className="ml-2 text-xs opacity-70">- {role.description}</span>
      )}
    </Badge>
  );
}
