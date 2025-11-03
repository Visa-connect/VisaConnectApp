import React from 'react';
import { ReportTargetDetails } from '../../api/reportService';

interface ReportTargetModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ReportTargetDetails | null;
}

const Row: React.FC<{ label: string; children?: React.ReactNode }> = ({
  label,
  children,
}) => (
  <div className="mb-3">
    <div className="text-xs uppercase text-gray-500 mb-1">{label}</div>
    <div className="text-sm text-gray-900">{children || '-'}</div>
  </div>
);

const ReportTargetModal: React.FC<ReportTargetModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black bg-opacity-40"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            {data?.target_type === 'job' ? 'Job Details' : 'Meetup Details'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Poster */}
          <div className="md:col-span-2">
            <div className="text-sm font-medium text-gray-900 mb-2">Poster</div>
            <div className="flex items-center space-x-3">
              {data?.poster?.profile_photo_url ? (
                <img
                  src={data.poster.profile_photo_url}
                  alt="Poster"
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200" />
              )}
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {data?.poster?.first_name} {data?.poster?.last_name}
                </div>
                <div className="text-xs text-gray-500">
                  {data?.poster?.email}
                </div>
              </div>
            </div>
          </div>

          {data?.target_type === 'job' && (
            <>
              <div className="md:col-span-2">
                <Row label="Title">{data.job?.title}</Row>
              </div>
              <div>
                <Row label="Location">{data.job?.location}</Row>
                <Row label="Type">{data.job?.job_type}</Row>
              </div>
              <div>
                <Row label="Business">{data.job?.business_name}</Row>
                <Row label="Website">{data.job?.business_website}</Row>
              </div>
              <div className="md:col-span-2">
                <Row label="Description">
                  <div className="whitespace-pre-wrap">
                    {data.job?.description}
                  </div>
                </Row>
              </div>
            </>
          )}

          {data?.target_type === 'meetup' && (
            <>
              <div className="md:col-span-2">
                <Row label="Title">{data.meetup?.title}</Row>
              </div>
              <div>
                <Row label="Location">{data.meetup?.location}</Row>
              </div>
              <div>
                <Row label="Time">
                  {data.meetup?.meetup_date
                    ? new Date(data.meetup.meetup_date).toLocaleString()
                    : '-'}
                </Row>
              </div>
              {data.meetup?.photo_url && (
                <div className="md:col-span-2">
                  <div className="text-xs uppercase text-gray-500 mb-1">
                    Photo
                  </div>
                  <img
                    src={data.meetup.photo_url}
                    alt={data.meetup.title}
                    className="rounded-md max-h-64 object-contain"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <Row label="Description">
                  <div className="whitespace-pre-wrap">
                    {data.meetup?.description}
                  </div>
                </Row>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportTargetModal;
