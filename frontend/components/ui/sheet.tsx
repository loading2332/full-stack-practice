'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const sideVariants = {
  left: 'inset-y-0 left-0 h-full w-full max-w-sm border-r',
  right: 'inset-y-0 right-0 h-full w-full max-w-sm border-l',
  top: 'inset-x-0 top-0 w-full border-b',
  bottom: 'inset-x-0 bottom-0 w-full border-t',
} as const;

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;
export const SheetPortal = Dialog.Portal;

export function SheetOverlay({
  className,
  ...props
}: Dialog.DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn(
        'fixed inset-0 z-50 bg-zinc-950/65 backdrop-blur-[2px]',
        className,
      )}
      {...props}
    />
  );
}

type SheetContentProps = Dialog.DialogContentProps & {
  side?: keyof typeof sideVariants;
  showClose?: boolean;
};

export function SheetContent({
  side = 'right',
  className,
  children,
  showClose = true,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={cn(
          'fixed z-50 flex flex-col bg-zinc-950 text-zinc-100 shadow-2xl shadow-black/40',
          'focus-visible:outline-none',
          sideVariants[side],
          className,
        )}
        {...props}
      >
        {children}
        {showClose ? (
          <Dialog.Close
            className={cn(
              'absolute right-4 top-4 inline-flex size-9 items-center justify-center rounded-full border border-white/10 text-zinc-300 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60',
            )}
          >
            <X aria-hidden="true" className="size-4" />
            <span className="sr-only">Close panel</span>
          </Dialog.Close>
        ) : null}
      </Dialog.Content>
    </SheetPortal>
  );
}

export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-white/10 px-5 py-4',
        className,
      )}
      {...props}
    />
  );
}

export function SheetFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('mt-auto border-t border-white/10 px-5 py-4', className)}
      {...props}
    />
  );
}

export function SheetTitle({ className, ...props }: Dialog.DialogTitleProps) {
  return (
    <Dialog.Title
      className={cn('text-base font-semibold text-white', className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: Dialog.DialogDescriptionProps) {
  return (
    <Dialog.Description
      className={cn('text-sm leading-6 text-zinc-400', className)}
      {...props}
    />
  );
}
