'use client';

/**
 * Confirmation Dialog Component
 * Provides consistent confirmation modals for destructive actions
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title = 'Confirm Action',
  description = 'Are you sure you want to proceed? This action cannot be undone.',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'destructive', // 'destructive' | 'default' | 'warning'
  icon,
  onConfirm,
  loading = false,
}) {
  const variantConfig = {
    destructive: {
      iconClass: 'fas fa-exclamation-triangle',
      iconColor: 'text-destructive',
      bgColor: 'bg-destructive/10',
      buttonVariant: 'destructive',
    },
    warning: {
      iconClass: 'fas fa-exclamation-circle',
      iconColor: 'text-amber-600',
      bgColor: 'bg-amber-100',
      buttonVariant: 'default',
    },
    default: {
      iconClass: 'fas fa-question-circle',
      iconColor: 'text-primary',
      bgColor: 'bg-primary/10',
      buttonVariant: 'default',
    },
  };

  const config = variantConfig[variant] || variantConfig.default;
  const displayIcon = icon || config.iconClass;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
              <i className={`${displayIcon} ${config.iconColor}`} aria-hidden="true"></i>
            </div>
            <div className="flex-1">
              <AlertDialogTitle className="text-lg">{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={loading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={loading}
            className={variant === 'destructive' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''}
          >
            {loading ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2" aria-hidden="true"></i>
                Processing...
              </>
            ) : (
              confirmLabel
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for easier usage
import { useState, useCallback } from 'react';

export function useConfirmDialog() {
  const [dialogState, setDialogState] = useState({
    open: false,
    title: '',
    description: '',
    confirmLabel: 'Confirm',
    variant: 'destructive',
    icon: null,
    onConfirm: null,
    loading: false,
  });

  const confirm = useCallback(({
    title,
    description,
    confirmLabel = 'Confirm',
    variant = 'destructive',
    icon = null,
  }) => {
    return new Promise((resolve) => {
      setDialogState({
        open: true,
        title,
        description,
        confirmLabel,
        variant,
        icon,
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, open: false }));
          resolve(true);
        },
        loading: false,
      });
    });
  }, []);

  const close = useCallback(() => {
    setDialogState(prev => ({ ...prev, open: false }));
  }, []);

  const setLoading = useCallback((loading) => {
    setDialogState(prev => ({ ...prev, loading }));
  }, []);

  const DialogComponent = () => (
    <ConfirmDialog
      open={dialogState.open}
      onOpenChange={(open) => {
        if (!open) {
          setDialogState(prev => ({ ...prev, open: false }));
        }
      }}
      title={dialogState.title}
      description={dialogState.description}
      confirmLabel={dialogState.confirmLabel}
      variant={dialogState.variant}
      icon={dialogState.icon}
      onConfirm={dialogState.onConfirm}
      loading={dialogState.loading}
    />
  );

  return { confirm, close, setLoading, DialogComponent };
}
