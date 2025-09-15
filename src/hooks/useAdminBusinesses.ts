import { useCallback, useEffect } from 'react';
import { useAdminStore, adminActions } from '../stores/adminStore';
import { BusinessApiService } from '../api/businessApi';

export const useAdminBusinesses = () => {
  const { state, dispatch } = useAdminStore();

  const fetchBusinesses = useCallback(async () => {
    try {
      dispatch(adminActions.setLoading(true));
      dispatch(adminActions.clearError());

      // Fetch all businesses
      const response = await BusinessApiService.getAllBusinesses({
        orderBy: 'submitted_at',
        orderDirection: 'DESC',
      });

      if (response.success && response.data) {
        dispatch(adminActions.setBusinesses(response.data));
      } else {
        dispatch(
          adminActions.setError(response.message || 'Failed to load businesses')
        );
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
      dispatch(
        adminActions.setError('Failed to load businesses. Please try again.')
      );
    }
  }, [dispatch]);

  const fetchBusinessCounts = useCallback(async () => {
    try {
      const [allResponse, pendingResponse, approvedResponse, rejectedResponse] =
        await Promise.all([
          BusinessApiService.getAllBusinesses({ limit: 1 }),
          BusinessApiService.getAllBusinesses({ status: 'pending', limit: 1 }),
          BusinessApiService.getAllBusinesses({ status: 'approved', limit: 1 }),
          BusinessApiService.getAllBusinesses({ status: 'rejected', limit: 1 }),
        ]);

      dispatch(
        adminActions.setCounts({
          all: allResponse.pagination?.total || 0,
          pending: pendingResponse.pagination?.total || 0,
          approved: approvedResponse.pagination?.total || 0,
          rejected: rejectedResponse.pagination?.total || 0,
        })
      );
    } catch (error) {
      console.error('Error fetching business counts:', error);
    }
  }, [dispatch]);

  const updateBusinessStatus = useCallback(
    async (
      businessId: number,
      status: 'approved' | 'rejected',
      adminNotes?: string
    ) => {
      try {
        const response = await BusinessApiService.updateBusinessStatus(
          businessId,
          status,
          adminNotes
        );

        if (response.success && response.data) {
          dispatch(adminActions.updateBusiness(response.data));
          // Refresh counts after status update
          await fetchBusinessCounts();
        } else {
          dispatch(
            adminActions.setError(
              response.message || 'Failed to update business status'
            )
          );
        }
      } catch (error) {
        console.error('Error updating business status:', error);
        dispatch(
          adminActions.setError(
            'Failed to update business status. Please try again.'
          )
        );
      }
    },
    [dispatch, fetchBusinessCounts]
  );

  const refreshData = useCallback(async () => {
    await Promise.all([fetchBusinesses(), fetchBusinessCounts()]);
  }, [fetchBusinesses, fetchBusinessCounts]);

  // Initialize data on mount
  useEffect(() => {
    if (state.businesses.length === 0) {
      refreshData();
    }
  }, [refreshData, state.businesses.length]);

  return {
    businesses: state.businesses,
    businessCounts: state.businessCounts,
    loading: state.loading,
    error: state.error,
    fetchBusinesses,
    fetchBusinessCounts,
    updateBusinessStatus,
    refreshData,
  };
};
