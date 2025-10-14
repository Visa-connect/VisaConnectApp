import React, { useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ReportModerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes?: string) => void;
  report: any;
  action: 'resolve' | 'remove' | null;
}

export const ReportModerationModal: React.FC<ReportModerationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  report,
  action,
}) => {
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(notes.trim() || undefined);
      setNotes('');
    } catch (error) {
      console.error('Error moderating report:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNotes('');
      onClose();
    }
  };

  if (!report || !action) return null;

  const isResolve = action === 'resolve';
  const actionText = isResolve ? 'Resolve' : 'Remove';
  const actionDescription = isResolve
    ? 'This will mark the report as resolved and keep the post visible.'
    : 'This will mark the report as removed and hide the post from users.';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100">
                  {isResolve ? (
                    <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  )}
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  {actionText} Report
                </Dialog.Title>

                <div className="mt-2">
                  <p className="text-sm text-gray-500 text-center mb-4">
                    {actionDescription}
                  </p>

                  {/* Report Details */}
                  <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <div className="text-sm">
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-gray-700">
                          Report ID:
                        </span>
                        <span className="text-gray-600">
                          {report.report_id.substring(0, 8)}...
                        </span>
                      </div>
                      <div className="flex justify-between mb-2">
                        <span className="font-medium text-gray-700">
                          Target:
                        </span>
                        <span className="text-gray-600 capitalize">
                          {report.target_type}
                        </span>
                      </div>
                      <div className="mb-2">
                        <span className="font-medium text-gray-700 block mb-1">
                          Reason:
                        </span>
                        <p className="text-gray-600 text-xs bg-white p-2 rounded border">
                          {report.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Input */}
                  <div className="mb-4">
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any notes about this decision..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isSubmitting}
                    />
                  </div>

                  {/* Warning for Remove Action */}
                  {!isResolve && (
                    <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mt-0.5 mr-2" />
                        <div className="text-sm">
                          <p className="text-red-800 font-medium">Warning</p>
                          <p className="text-red-700">
                            This action will hide the post from all users. This
                            action cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 flex space-x-3">
                  <button
                    type="button"
                    className="flex-1 inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`flex-1 inline-flex justify-center px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isResolve
                        ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                        : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                    }`}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      <>
                        {isResolve ? (
                          <CheckCircleIcon className="w-4 h-4 mr-1" />
                        ) : (
                          <XCircleIcon className="w-4 h-4 mr-1" />
                        )}
                        {actionText}
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
