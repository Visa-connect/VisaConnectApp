import { useCallback, useState } from 'react';
import { useAdminStore, adminActions } from '../stores/adminStore';
import {
  reportService,
  Report,
  SearchReportsParams,
} from '../api/reportService';

export const useAdminReports = () => {
  const { state, dispatch } = useAdminStore();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalReports, setTotalReports] = useState(0);
  const [pageSize] = useState(50); // Configurable page size

  const calculateReportCounts = useCallback(
    (reports: Report[]) => {
      const counts = {
        all: reports.length,
        pending: reports.filter((report) => report.status === 'pending').length,
        resolved: reports.filter((report) => report.status === 'resolved')
          .length,
        removed: reports.filter((report) => report.status === 'removed').length,
      };

      dispatch(adminActions.setReportCounts(counts));
      return counts;
    },
    [dispatch]
  );

  const fetchReports = useCallback(
    async (page: number = currentPage, searchParams?: SearchReportsParams) => {
      try {
        dispatch(adminActions.setLoading(true));
        dispatch(adminActions.clearError());

        const offset = (page - 1) * pageSize;

        // Fetch reports with pagination
        const response = await reportService.searchReports({
          limit: pageSize,
          offset,
          sort_by: 'created_at',
          sort_order: 'desc',
          ...searchParams,
        });

        if (response.success && response.data) {
          dispatch(adminActions.setReports(response.data));
          setTotalReports(response.total);
          setTotalPages(Math.ceil(response.total / pageSize));
          setCurrentPage(page);
          // Only calculate counts for current page reports to avoid confusion
          // For accurate counts, we'd need separate API calls for each status
        } else {
          dispatch(adminActions.setError('Failed to load reports'));
        }
      } catch (error) {
        console.error('Error fetching reports:', error);
        dispatch(
          adminActions.setError('Failed to load reports. Please try again.')
        );
      }
    },
    [dispatch, currentPage, pageSize]
  );

  const updateReportStatus = useCallback(
    async (reportId: string, action: 'resolve' | 'remove', notes?: string) => {
      try {
        let response;

        if (action === 'resolve') {
          response = await reportService.resolveReport(reportId, { notes });
        } else {
          response = await reportService.removeReport(reportId, { notes });
        }

        if (response) {
          // Update the report in the store
          const updatedReports = state.reports.map((report) =>
            report.report_id === reportId ? { ...report, ...response } : report
          );
          dispatch(adminActions.setReports(updatedReports));
          // Recalculate counts after report update
          calculateReportCounts(updatedReports);
        } else {
          dispatch(adminActions.setError('Failed to update report'));
        }
      } catch (error) {
        console.error('Error updating report:', error);
        dispatch(
          adminActions.setError('Failed to update report. Please try again.')
        );
      }
    },
    [dispatch, calculateReportCounts, state.reports]
  );

  const refreshData = useCallback(async () => {
    await fetchReports(1); // Reset to first page on refresh
  }, [fetchReports]);

  const goToPage = useCallback(
    async (page: number) => {
      if (page >= 1 && page <= totalPages) {
        await fetchReports(page);
      }
    },
    [fetchReports, totalPages]
  );

  const nextPage = useCallback(async () => {
    if (currentPage < totalPages) {
      await fetchReports(currentPage + 1);
    }
  }, [fetchReports, currentPage, totalPages]);

  const previousPage = useCallback(async () => {
    if (currentPage > 1) {
      await fetchReports(currentPage - 1);
    }
  }, [fetchReports, currentPage]);

  const searchReports = useCallback(
    async (searchParams: SearchReportsParams) => {
      await fetchReports(1, searchParams); // Reset to first page on search
    },
    [fetchReports]
  );

  // Note: Components should call refreshData() explicitly when needed
  // This avoids unnecessary fetch loops caused by useCallback dependencies

  return {
    reports: state.reports,
    reportCounts: state.reportCounts,
    loading: state.loading,
    error: state.error,
    // Pagination data
    currentPage,
    totalPages,
    totalReports,
    pageSize,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    // Actions
    fetchReports,
    updateReportStatus,
    refreshData,
    goToPage,
    nextPage,
    previousPage,
    searchReports,
  };
};
