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
      await onConfirm(notes);
      setNotes('');
    } catch (error) {
      console.error('Error in moderation:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  const getActionDetails = () => {
    switch (action) {
      case 'resolve':
        return {
          title: 'Resolve Report',
          description:
            'Mark this report as resolved. The post will remain visible.',
          icon: CheckCircleIcon,
          iconColor: 'text-green-600',
          buttonColor: 'bg-green-600 hover:bg-green-700',
          buttonText: 'Resolve Report',
        };
      case 'remove':
        return {
          title: 'Remove Post',
          description:
            'Mark this report as resolved and remove the reported post.',
          icon: XCircleIcon,
          iconColor: 'text-red-600',
          buttonColor: 'bg-red-600 hover:bg-red-700',
          buttonText: 'Remove Post',
        };
      default:
        return {
          title: 'Moderate Report',
          description: 'Take action on this report.',
          icon: ExclamationTriangleIcon,
          iconColor: 'text-orange-600',
          buttonColor: 'bg-orange-600 hover:bg-orange-700',
          buttonText: 'Submit Action',
        };
    }
  };

  const actionDetails = getActionDetails();
  const IconComponent = actionDetails.icon;

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
                <div className="flex items-center mb-4">
                  <div
                    className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100`}
                  >
                    <IconComponent
                      className={`h-6 w-6 ${actionDetails.iconColor}`}
                    />
                  </div>
                </div>

                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 text-center mb-2"
                >
                  {actionDetails.title}
                </Dialog.Title>

                <div className="mb-4">
                  <p className="text-sm text-gray-500 text-center mb-4">
                    {actionDetails.description}
                  </p>

                  {report && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <div className="text-xs text-gray-600">
                        <strong>Report ID:</strong>{' '}
                        {report.report_id?.slice(-8)}...
                      </div>
                      <div className="text-xs text-gray-600">
                        <strong>Target:</strong> {report.target_type} -{' '}
                        {report.target_id?.slice(-8)}...
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        <strong>Reason:</strong>{' '}
                        {report.reason?.substring(0, 100)}
                        {report.reason?.length > 100 && '...'}
                      </div>
                    </div>
                  )}

                  <div>
                    <label
                      htmlFor="notes"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Add any notes about your decision..."
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={handleClose}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`inline-flex justify-center rounded-md border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${actionDetails.buttonColor}`}
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Processing...' : actionDetails.buttonText}
                  </button>
                </div>

                {action === 'remove' && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-800">
                          Warning
                        </h3>
                        <div className="mt-1 text-sm text-red-700">
                          <p>
                            This action will remove the reported content. This
                            cannot be undone.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};
